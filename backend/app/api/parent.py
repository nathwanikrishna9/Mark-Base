"""
Parent API endpoints for viewing linked student's day-wise attendance.
Parents can view attendance data but cannot modify it.
Supports multiple children - parent can switch between children.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models import Parent, Student, DailyAttendance, ParentStudent


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


def _verify_parent_child_access(db: Session, parent_id: int, student_id: int):
    """Verify that this parent has access to this student's data."""
    # Check association table first
    link = db.query(ParentStudent).filter(
        ParentStudent.parent_id == parent_id,
        ParentStudent.student_id == student_id
    ).first()
    if link:
        return True
    
    # Fallback to legacy student_id
    parent = db.query(Parent).filter(Parent.id == parent_id, Parent.student_id == student_id).first()
    return parent is not None


@router.get("/children/{parent_id}")
def get_all_children(parent_id: int, db: Session = Depends(get_db)):
    """Get all children linked to this parent account."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    # Get children from association table
    links = db.query(ParentStudent).filter(ParentStudent.parent_id == parent_id).all()
    children = []
    
    for link in links:
        student = db.query(Student).filter(Student.id == link.student_id).first()
        if student:
            division_name = student.division.name if student.division else "N/A"
            class_name = ""
            dept_name = ""
            if student.division and student.division.class_:
                class_name = student.division.class_.name
                if student.division.class_.department:
                    dept_name = student.division.class_.department.name
            children.append({
                "student_id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "roll_number": student.roll_number,
                "division": division_name,
                "class_name": class_name,
                "department": dept_name,
                "email": student.email,
                "phone": student.phone
            })
    
    # Fallback: if no association records, use legacy student_id
    if not children and parent.student_id:
        student = db.query(Student).filter(Student.id == parent.student_id).first()
        if student:
            children.append({
                "student_id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "roll_number": student.roll_number,
                "division": student.division.name if student.division else "N/A",
                "class_name": "",
                "department": "",
                "email": student.email,
                "phone": student.phone
            })
    
    return children


@router.get("/child-info/{parent_id}")
def get_child_info(parent_id: int, student_id: int = None, db: Session = Depends(get_db)):
    """Get information about linked student. Optionally specify student_id to get a specific child."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent not found"
        )
    
    # If student_id specified, verify access and use it
    if student_id:
        if not _verify_parent_child_access(db, parent_id, student_id):
            raise HTTPException(status_code=403, detail="You don't have access to this student's data")
        student = db.query(Student).filter(Student.id == student_id).first()
    else:
        student = parent.student
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
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
def get_child_daily_log(parent_id: int, student_id: int = None, limit: int = 30, db: Session = Depends(get_db)):
    """
    Get daily attendance log for linked student.
    Optionally specify student_id to get a specific child's log.
    """
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    # Use specified student_id or fallback to primary child
    target_student_id = student_id
    if target_student_id:
        if not _verify_parent_child_access(db, parent_id, target_student_id):
            raise HTTPException(status_code=403, detail="You don't have access to this student's data")
    else:
        target_student_id = parent.student_id
    
    records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == target_student_id
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
def get_child_late_records(parent_id: int, student_id: int = None, db: Session = Depends(get_db)):
    """Get all late day-wise attendance records. Optionally specify student_id."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    target_student_id = student_id
    if target_student_id:
        if not _verify_parent_child_access(db, parent_id, target_student_id):
            raise HTTPException(status_code=403, detail="You don't have access to this student's data")
    else:
        target_student_id = parent.student_id
        
    late_records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == target_student_id,
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
def get_child_absent_records(parent_id: int, student_id: int = None, db: Session = Depends(get_db)):
    """Get all absent records for linked student. Optionally specify student_id."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    target_student_id = student_id
    if target_student_id:
        if not _verify_parent_child_access(db, parent_id, target_student_id):
            raise HTTPException(status_code=403, detail="You don't have access to this student's data")
    else:
        target_student_id = parent.student_id
        
    absent_records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == target_student_id,
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

@router.get("/child-present-records/{parent_id}")
def get_child_present_records(parent_id: int, student_id: int = None, db: Session = Depends(get_db)):
    """Get all present records for linked student. Optionally specify student_id."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    target_student_id = student_id
    if target_student_id:
        if not _verify_parent_child_access(db, parent_id, target_student_id):
            raise HTTPException(status_code=403, detail="You don't have access to this student's data")
    else:
        target_student_id = parent.student_id
        
    present_records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == target_student_id,
        DailyAttendance.status == "present"
    ).order_by(DailyAttendance.date.desc()).all()
    
    result = []
    for record in present_records:
        result.append({
            "date": str(record.date),
            "marked_at": str(record.check_in_time) if record.check_in_time else "N/A",
        })
    
    return {
        "total_present": len(present_records),
        "present_records": result
    }



@router.get("/{parent_id}/dashboard")
def get_parent_dashboard(parent_id: int, student_id: int = None, db: Session = Depends(get_db)):
    """
    Get parent dashboard with child's day-wise attendance overview.
    Optionally specify student_id to view a specific child's dashboard.
    """
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    # Determine which student to show
    target_student_id = student_id
    if target_student_id:
        if not _verify_parent_child_access(db, parent_id, target_student_id):
            raise HTTPException(status_code=403, detail="You don't have access to this student's data")
        student = db.query(Student).filter(Student.id == target_student_id).first()
    else:
        student = parent.student
    
    if not student:
        raise HTTPException(status_code=404, detail="No student linked to this parent")
    
    target_student_id = student.id
    
    # Overall stats
    overall_stats = _get_student_attendance_stats(db, target_student_id)
    
    # Recent attendance (last 7 days)
    recent_records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == target_student_id
    ).order_by(DailyAttendance.date.desc()).limit(7).all()
    
    late_count = sum(1 for r in recent_records if r.status == "late")
    absent_count = sum(1 for r in recent_records if r.status == "absent")
    present_count = sum(1 for r in recent_records if r.status == "present")
    
    return {
        "child_info": {
            "student_id": student.id,
            "name": f"{student.first_name} {student.last_name}",
            "roll_number": student.roll_number,
            "division": student.division.name if student.division else "Unassigned"
        },
        "overall_statistics": overall_stats,
        "recent_late_count": late_count,
        "recent_absent_count": absent_count,
        "recent_present_count": present_count,
        "last_7_days_attendance": [
            {
                "date": str(r.date),
                "status": r.status.capitalize()
            }
            for r in recent_records
        ]
    }
