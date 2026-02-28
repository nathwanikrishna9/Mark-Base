"""
Timetable API endpoints for managing session-based timetables.
Admin and staff can view/manage timetables.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import time
from app.core.database import get_db
from app.services.timetable_service import TimetableService
from app.models import TimetableSession


router = APIRouter(prefix="/api/timetable", tags=["Timetable"])


# Request Models
class CreateTimetableSessionRequest(BaseModel):
    division_id: int
    batch_id: Optional[int] = None
    subject_id: int
    staff_id: int
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # HH:MM format
    end_time: str
    session_type: str  # theory or lab
    room_number: Optional[str] = None


@router.post("/sessions")
def create_timetable_session(
    request: CreateTimetableSessionRequest,
    db: Session = Depends(get_db)
):
    """Create a new timetable session."""
    from app.utils.time_utils import string_to_time
    
    # Convert time strings to time objects
    start_time = string_to_time(request.start_time)
    end_time = string_to_time(request.end_time)
    
    # Check for conflicts
    has_conflict = TimetableService.check_session_conflict(
        db, request.staff_id, request.day_of_week, start_time, end_time
    )
    
    if has_conflict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time conflict detected for this staff member"
        )
    
    # Create session
    session = TimetableService.create_timetable_session(
        db=db,
        division_id=request.division_id,
        subject_id=request.subject_id,
        staff_id=request.staff_id,
        day_of_week=request.day_of_week,
        start_time=start_time,
        end_time=end_time,
        session_type=request.session_type,
        batch_id=request.batch_id,
        room_number=request.room_number
    )
    
    return session


@router.get("/division/{division_id}")
def get_division_timetable(
    division_id: int,
    day: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get timetable for a division."""
    sessions = TimetableService.get_sessions_for_division(db, division_id, day)
    
    return [
        {
            "id": s.id,
            "subject": s.subject.name,
            "staff": f"{s.staff.first_name} {s.staff.last_name}",
            "day": s.day_of_week,
            "start_time": str(s.start_time),
            "end_time": str(s.end_time),
            "type": s.session_type,
            "room": s.room_number
        }
        for s in sessions
    ]


@router.get("/staff/{staff_id}")
def get_staff_timetable(staff_id: int, db: Session = Depends(get_db)):
    """Get weekly timetable for staff."""
    return TimetableService.get_weekly_timetable_for_staff(db, staff_id)


@router.delete("/sessions/{session_id}")
def delete_timetable_session(session_id: int, db: Session = Depends(get_db)):
    """Delete a timetable session."""
    session = db.query(TimetableSession).filter(TimetableSession.id == session_id).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timetable session not found"
        )
    
    try:
        db.delete(session)
        db.commit()
        return {"message": "Timetable session deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete session: {str(e)}"
        )


@router.get("/sessions")
def get_all_timetable_sessions(db: Session = Depends(get_db)):
    """Get all timetable sessions with details."""
    sessions = db.query(TimetableSession).all()
    
    return [
        {
            "id": s.id,
            "division_id": s.division_id,
            "division": f"{s.division.class_.name} {s.division.name}",
            "batch_id": s.batch_id,
            "batch": s.batch.name if s.batch_id else None,
            "subject_id": s.subject_id,
            "subject": s.subject.name,
            "staff_id": s.staff_id,
            "staff": f"{s.staff.first_name} {s.staff.last_name}",
            "day_of_week": s.day_of_week,
            "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][s.day_of_week],
            "start_time": str(s.start_time),
            "end_time": str(s.end_time),
            "session_type": s.session_type,
            "room_number": s.room_number
        }
        for s in sessions
    ]