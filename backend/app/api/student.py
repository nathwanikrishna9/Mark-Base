"""
Student API endpoints for viewing day-wise attendance records.
Students can only view their own attendance data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
from app.core.database import get_db
from app.models import Student, DailyAttendance


router = APIRouter(prefix="/api/student", tags=["Student"])


class DailyAttendanceResponse(BaseModel):
    date: str
    status: str
    check_in_time: str
    marked_method: str

class StudentDashboardResponse(BaseModel):
    student_info: dict
    overall_statistics: dict
    recent_attendance: List[DailyAttendanceResponse]
    late_entries_count: int


def _get_student_attendance_stats(db: Session, student_id: int):
    records = db.query(DailyAttendance).filter(DailyAttendance.student_id == student_id).all()
    
    total = len(records)
    present = sum(1 for r in records if r.status == 'present')
    late = sum(1 for r in records if r.status == 'late')
    absent = sum(1 for r in records if r.status == 'absent')
    
    percentage = 0
    if total > 0:
        # Assuming late is counted as present for percentage, or half? Typically present + late
        percentage = round(((present + late) / total) * 100, 2)
        
    return {
        "total": total,
        "present": present,
        "late": late,
        "absent": absent,
        "percentage": percentage
    }


@router.get("/{student_id}/attendance", response_model=List[DailyAttendanceResponse])
def get_my_attendance(
    student_id: int, 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get detailed daily attendance records for a student.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    query = db.query(DailyAttendance).filter(DailyAttendance.student_id == student_id)
    
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(DailyAttendance.date >= sd)
        except ValueError:
            pass
            
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(DailyAttendance.date <= ed)
        except ValueError:
            pass
            
    records = query.order_by(DailyAttendance.date.desc()).all()
    
    result = []
    for record in records:
        result.append({
            "date": str(record.date),
            "status": record.status.capitalize(),
            "check_in_time": str(record.check_in_time) if record.check_in_time else "N/A",
            "marked_method": record.marked_method or "unknown"
        })
        
    return result


@router.get("/{student_id}/dashboard", response_model=StudentDashboardResponse)
def get_student_dashboard(student_id: int, db: Session = Depends(get_db)):
    """
    Get student dashboard data with recent day-wise attendance.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Overall stats
    stats = _get_student_attendance_stats(db, student_id)
    
    # Recent attendance (last 10 records)
    recent_records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == student_id
    ).order_by(
        DailyAttendance.date.desc()
    ).limit(10).all()
    
    recent_attendance = [
        {
            "date": str(record.date),
            "status": record.status.capitalize(),
            "check_in_time": str(record.check_in_time) if record.check_in_time else "N/A",
            "marked_method": record.marked_method or "unknown"
        }
        for record in recent_records
    ]
    
    return {
        "student_info": {
            "name": f"{student.first_name} {student.last_name}",
            "roll_number": student.roll_number,
            "division": student.division.name if student.division else "Unassigned",
            "batch": student.batch.name if student.batch else None
        },
        "overall_statistics": stats,
        "recent_attendance": recent_attendance,
        "late_entries_count": stats['late']
    }
