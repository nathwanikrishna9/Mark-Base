"""
Day-wise Attendance API - FastAPI router for daily attendance operations.
Implements 9:15-9:30 grace period logic.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime, time
from app.core.database import get_db
from app.models import DailyAttendance, Student, Division, GracePeriod
from pydantic import BaseModel

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


@router.post("/mark", response_model=AttendanceResponse)
def mark_attendance(
    request: MarkAttendanceRequest,
    db: Session = Depends(get_db)
):
    """Mark attendance for a single student."""
    try:
        # Parse time and date
        check_time = datetime.strptime(request.check_in_time, "%H:%M:%S").time()
        today = date.today()
        
        # Get grace period (default 9:15-9:30)
        grace_start = time(9, 15)
        grace_end = time(9, 30)
        
        # Determine status
        if check_time <= grace_end:
            status = "present"
        elif check_time <= time(9, 45):
            status = "late"
        else:
            status = "absent"
        
        # Get student to get division_id
        student = db.query(Student).filter(Student.id == request.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Check if already marked
        existing = db.query(DailyAttendance).filter(
            DailyAttendance.student_id == request.student_id,
            DailyAttendance.date == today
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Attendance already marked for today")
        
        # Create attendance record
        attendance = DailyAttendance(
            student_id=request.student_id,
            division_id=student.division_id,
            date=today,
            check_in_time=check_time,
            status=status,
            marked_by=request.marked_by,
            marked_method=request.method
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        return attendance
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


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
                    check_in_time=time(9, 15),
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
    
    attendance_records = []
    for student in students:
        attendance = db.query(DailyAttendance).filter(
            DailyAttendance.student_id == student.id,
            DailyAttendance.date == date
        ).first()
        
        attendance_records.append({
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "roll_number": student.roll_number,
            "status": attendance.status if attendance else "unmarked",
            "check_in_time": str(attendance.check_in_time) if attendance else None
        })
    
    return {
        "division_id": division_id,
        "date": date,
        "total_students": len(students),
        "records": attendance_records
    }
