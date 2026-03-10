"""
Parent API endpoints for viewing linked student's day-wise attendance.
Parents can view attendance data but cannot modify it.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models import Parent, Student, DailyAttendance


router = APIRouter(prefix="/api/parent", tags=["Parent"])


def _get_student_attendance_stats(db: Session, student_id: int):
    records = db.query(DailyAttendance).filter(DailyAttendance.student_id == student_id).all()
    
    total = len(records)
    present = sum(1 for r in records if r.status == 'present')
    late = sum(1 for r in records if r.status == 'late')
    absent = sum(1 for r in records if r.status == 'absent')
    
    percentage = 0
    if total > 0:
        percentage = round(((present + late) / total) * 100, 2)
        
    return {
        "total": total,
        "present": present,
        "late": late,
        "absent": absent,
        "percentage": percentage
    }


@router.get("/child-info/{parent_id}")
def get_child_info(parent_id: int, db: Session = Depends(get_db)):
    """Get information about linked student."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent not found"
        )
    
    student = parent.student
    
    return {
        "student_id": student.id,
        "name": f"{student.first_name} {student.last_name}",
        "roll_number": student.roll_number,
        "division": student.division.name if student.division else None,
        "batch": student.batch.name if student.batch else None,
        "email": student.email,
        "phone": student.phone
    }


@router.get("/student/{student_id}/attendance")
def get_child_attendance(student_id: int, db: Session = Depends(get_db)):
    """
    Get complete day-wise attendance data for linked student.
    """
    records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == student_id
    ).order_by(DailyAttendance.date.desc()).all()
    
    result = []
    for record in records:
        result.append({
            "date": str(record.date),
            "status": record.status.capitalize(),
            "check_in_time": str(record.check_in_time) if record.check_in_time else "N/A",
            "marked_method": record.marked_method or "unknown"
        })
    
    return result


@router.get("/child-daily-log/{parent_id}")
def get_child_daily_log(parent_id: int, limit: int = 30, db: Session = Depends(get_db)):
    """
    Get daily attendance log limit for linked student.
    """
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == parent.student_id
    ).order_by(DailyAttendance.date.desc()).limit(limit).all()
    
    result = []
    for record in records:
        result.append({
            "date": str(record.date),
            "day": record.date.strftime("%A"),
            "status": record.status.capitalize(),
            "marked_at": str(record.check_in_time) if record.check_in_time else "N/A"
        })
    return result


@router.get("/child-late-records/{parent_id}")
def get_child_late_records(parent_id: int, db: Session = Depends(get_db)):
    """Get all late day-wise attendance records for linked student."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
        
    late_records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == parent.student_id,
        DailyAttendance.status == "late"
    ).order_by(DailyAttendance.date.desc()).all()
    
    result = []
    for record in late_records:
        result.append({
            "date": str(record.date),
            "marked_at": str(record.check_in_time) if record.check_in_time else "N/A",
            "delay_minutes": "Calculated Later Based On Entry Time" 
        })
    
    return {
        "total_late_entries": len(late_records),
        "late_records": result
    }


@router.get("/child-absent-records/{parent_id}")
def get_child_absent_records(parent_id: int, db: Session = Depends(get_db)):
    """Get all absent records for linked student."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
        
    absent_records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == parent.student_id,
        DailyAttendance.status == "absent"
    ).order_by(DailyAttendance.date.desc()).all()
    
    result = []
    for record in absent_records:
        result.append({
            "date": str(record.date),
            "day": record.date.strftime("%A"),
        })
    
    return {
        "total_absences": len(absent_records),
        "absent_records": result
    }


@router.get("/{parent_id}/dashboard")
def get_parent_dashboard(parent_id: int, db: Session = Depends(get_db)):
    """
    Get parent dashboard with child's day-wise attendance overview.
    """
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    student = parent.student
    student_id = student.id
    
    # Overall stats
    overall_stats = _get_student_attendance_stats(db, student_id)
    
    # Recent attendance (last 7 days)
    recent_records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == student_id
    ).order_by(DailyAttendance.date.desc()).limit(7).all()
    
    late_count = sum(1 for r in recent_records if r.status == "late")
    absent_count = sum(1 for r in recent_records if r.status == "absent")
    
    return {
        "child_info": {
            "name": f"{student.first_name} {student.last_name}",
            "roll_number": student.roll_number,
            "division": student.division.name if student.division else "Unassigned"
        },
        "overall_statistics": overall_stats,
        "recent_late_count": late_count,
        "recent_absent_count": absent_count,
        "last_7_days_attendance": [
            {
                "date": str(r.date),
                "status": r.status.capitalize()
            }
            for r in recent_records
        ]
    }
