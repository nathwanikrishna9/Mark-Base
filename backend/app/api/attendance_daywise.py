"""
Day-wise Attendance API - FastAPI router for daily attendance operations.
Implements 11:00-11:30 grace period logic.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, time
from app.core.database import get_db
from app.models import DailyAttendance, Student, Division, AttendanceSession
from pydantic import BaseModel
import asyncio
from app.websocket_manager import manager

router = APIRouter(prefix="/api/attendance/daywise", tags=["Day-wise Attendance"])


# Pydantic schemas
class MarkAttendanceRequest(BaseModel):
    student_id: int
    check_in_time: str  # Format: "HH:MM:SS"
    marked_by: int
    method: str = "face_recognition"


class BulkMarkRequest(BaseModel):
    division_id: int
    date: str  # Format: "YYYY-MM-DD"
    marked_by: int
    present_student_ids: List[int]


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    date: str
    status: str
    check_in_time: str
    
    class Config:
        from_attributes = True


def _serialize_attendance(att):
    """Convert a DailyAttendance ORM object to a plain dict for safe serialization."""
    return {
        "id": att.id,
        "student_id": att.student_id,
        "date": str(att.date),
        "status": att.status,
        "check_in_time": str(att.check_in_time) if att.check_in_time else "",
    }


@router.post("/mark")
def mark_attendance(
    request: MarkAttendanceRequest,
    db: Session = Depends(get_db)
):
    """Mark attendance for a single student."""
    try:
        # Parse time and date
        check_time = datetime.strptime(request.check_in_time, "%H:%M:%S").time()
        today = date.today()
        
        # Get grace period: 12:00-12:15 present, 12:15-12:20 late
        grace_start = time(12, 0)
        grace_end = time(12, 15, 0)
        late_cutoff = time(12, 20, 0)
        
        if check_time < grace_start:
            raise HTTPException(status_code=400, detail="Attendance window opens at 12:00 PM")
            
        # Determine status
        if check_time <= grace_end:
            att_status = "present"
        elif check_time <= late_cutoff:
            att_status = "late"
        else:
            att_status = "absent"
        
        # Get student to get division_id
        student = db.query(Student).filter(Student.id == request.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Enforce that there is an active session for the division 
        active_session = db.query(AttendanceSession).filter(
            AttendanceSession.division_id == student.division_id,
            AttendanceSession.date == today,
            AttendanceSession.status == 'open'
        ).first()

        if not active_session:
            # Maybe the staff closed it, or didn't open it.
            if check_time > late_cutoff:
                raise HTTPException(status_code=400, detail="Attendance window has closed for today")
            else:
                raise HTTPException(status_code=400, detail="Attendance is currently turned off for your class")

        
        # Check if already marked
        existing = db.query(DailyAttendance).filter(
            DailyAttendance.student_id == request.student_id,
            DailyAttendance.date == today
        ).first()
        
        if existing:
            # If the existing record was auto-generated (system absent), update it
            if existing.marked_method == 'system' and existing.status == 'absent':
                existing.status = att_status
                existing.check_in_time = check_time
                existing.marked_by = request.marked_by
                existing.marked_method = request.method
                db.commit()
                db.refresh(existing)
                
                # Broadcast WS update
                asyncio.run(manager.broadcast({
                    "type": "ATTENDANCE_UPDATE",
                    "student_id": existing.student_id,
                    "date": str(today),
                    "status": existing.status,
                    "check_in_time": str(existing.check_in_time),
                    "marked_method": existing.marked_method
                }, f"{student.division_id}_{str(today)}"))
                
                return _serialize_attendance(existing)
            # Otherwise truly idempotent - already marked by face/manual
            return _serialize_attendance(existing)
        
        # Create attendance record
        attendance = DailyAttendance(
            student_id=request.student_id,
            division_id=student.division_id,
            date=today,
            check_in_time=check_time,
            status=att_status,
            marked_by=request.marked_by,
            marked_method=request.method
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        # Broadcast WS update
        asyncio.run(manager.broadcast({
            "type": "ATTENDANCE_UPDATE",
            "student_id": attendance.student_id,
            "date": str(attendance.date),
            "status": attendance.status,
            "check_in_time": str(attendance.check_in_time),
            "marked_method": attendance.marked_method
        }, f"{student.division_id}_{str(today)}"))
        
        return _serialize_attendance(attendance)
    except HTTPException:
        db.rollback()
        raise  # Re-raise HTTP exceptions with their original status code
    except Exception as e:
        db.rollback()
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/bulk-mark")
def bulk_mark_attendance(
    request: BulkMarkRequest,
    db: Session = Depends(get_db)
):
    """Mark attendance for entire division."""
    try:
        attendance_date = datetime.strptime(request.date, "%Y-%m-%d").date()
        
        # Get all students in division
        students = db.query(Student).filter(Student.division_id == request.division_id).all()
        
        marked = 0
        for student in students:
            if student.id in request.present_student_ids:
                # Mark as present
                attendance = DailyAttendance(
                    student_id=student.id,
                    division_id=request.division_id,
                    date=attendance_date,
                    check_in_time=time(11, 0),
                    status="present",
                    marked_by=request.marked_by,
                    marked_method="manual"
                )
            else:
                # Mark as absent
                attendance = DailyAttendance(
                    student_id=student.id,
                    division_id=request.division_id,
                    date=attendance_date,
                    check_in_time=time(23, 59),
                    status="absent",
                    marked_by=request.marked_by,
                    marked_method="system"
                )
            
            db.add(attendance)
            marked += 1
        
        db.commit()
        
        return {"success": True, "marked": marked, "total_students": len(students)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}/{date}")
def get_student_attendance(
    student_id: int,
    date: str,
    db: Session = Depends(get_db)
):
    """Get attendance for a specific student on a specific date."""
    attendance = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == student_id,
        DailyAttendance.date == date
    ).first()
    
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    return attendance


@router.get("/division/{division_id}/{date}")
def get_division_attendance(
    division_id: int,
    date: str,
    db: Session = Depends(get_db)
):
    """Get attendance for entire division on a specific date."""
    students = db.query(Student).filter(Student.division_id == division_id).all()
    
    # Check if session is closed or late cutoff passed
    session = db.query(AttendanceSession).filter(
        AttendanceSession.division_id == division_id,
        AttendanceSession.date == date
    ).first()
    
    # If the session is explicitly closed, OR it's past 12:20 today, unmarked = absent
    late_cutoff_passed = False
    if date == str(datetime.today().date()):
        if datetime.now().time() >= time(12, 20):
            late_cutoff_passed = True
    elif date < str(datetime.today().date()):
        late_cutoff_passed = True # Past days are implicitly closed

    is_closed = (session and session.status == 'closed') or late_cutoff_passed

    attendance_records = []
    for student in students:
        attendance = db.query(DailyAttendance).filter(
            DailyAttendance.student_id == student.id,
            DailyAttendance.date == date
        ).first()
        
        # Auto-absent logic for viewing
        final_status = "unmarked"
        if attendance:
            final_status = attendance.status
        elif is_closed:
            final_status = "absent"
            
        attendance_records.append({
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "roll_number": student.roll_number,
            "status": final_status,
            "check_in_time": str(attendance.check_in_time) if attendance else None
        })
    
    return {
        "division_id": division_id,
        "date": date,
        "total_students": len(students),
        "records": attendance_records
    }

class OverrideAttendanceRequest(BaseModel):
    status: str
    updated_by: int

@router.patch("/override/{division_id}/{student_id}/{date}")
def override_attendance(
    division_id: int,
    student_id: int,
    date_str: str,
    request: OverrideAttendanceRequest,
    db: Session = Depends(get_db)
):
    """Override attendance status via UI toggle"""
    try:
        attendance_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    student = db.query(Student).filter(Student.id == student_id, Student.division_id == division_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in this division")
        
    if request.status not in ['present', 'late', 'absent']:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    existing = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == student_id,
        DailyAttendance.date == attendance_date
    ).first()
    
    check_time_map = {
        'present': time(12, 0),
        'late': time(12, 16),
        'absent': time(23, 59)
    }
    
    if existing:
        existing.status = request.status
        existing.edited_by = request.updated_by
        existing.edited_at = datetime.utcnow()
        if existing.marked_method == 'system' and request.status != 'absent':
             existing.check_in_time = check_time_map[request.status]
             existing.marked_method = 'manual'
    else:
        existing = DailyAttendance(
            student_id=student_id,
            division_id=division_id,
            date=attendance_date,
            check_in_time=check_time_map[request.status],
            status=request.status,
            edited_by=request.updated_by,
            edited_at=datetime.utcnow(),
            marked_method='manual'
        )
        db.add(existing)
        
    db.commit()
    db.refresh(existing)
    
    # Broadcast to websocket
    asyncio.run(manager.broadcast({
        "type": "ATTENDANCE_UPDATE",
        "student_id": student_id,
        "date": date_str,
        "status": existing.status,
        "check_in_time": str(existing.check_in_time),
        "marked_method": "manual"
    }, f"{division_id}_{date_str}"))
    
    return _serialize_attendance(existing)
