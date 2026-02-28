"""
Staff API endpoints for attendance management.
Handles session opening, student marking, and session closing.
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.services.timetable_service import TimetableService
from app.services.attendance_service import AttendanceService
from app.services.auth_service import AuthService
from app.models import AttendanceSession, AttendanceRecord, TimetableSession


router = APIRouter(prefix="/api/staff", tags=["Staff"])


# Response Models
class ActiveSessionResponse(BaseModel):
    session_id: int
    division_name: str
    batch_name: Optional[str]
    subject_name: str
    session_type: str
    start_time: str
    end_time: str
    room_number: Optional[str]


class AttendanceSessionResponse(BaseModel):
    id: int
    date: str
    status: str
    opened_at: str
    closed_at: Optional[str]
    session_start_time: str
    session_end_time: str


class MarkAttendanceRequest(BaseModel):
    student_id: int


class MarkAttendanceResponse(BaseModel):
    student_id: int
    student_name: str
    roll_number: str
    status: str
    marked_at: str


@router.get("/active-sessions/{staff_id}", response_model=List[ActiveSessionResponse])
def get_active_sessions(staff_id: int, db: Session = Depends(get_db)):
    """
    Get currently active timetable sessions for a staff member.
    
    Matches:
    - Current day of week
    - Current time (within session start/end)
    - Staff ID
    """
    sessions = TimetableService.get_active_sessions_for_staff(db, staff_id)
    
    result = []
    for session in sessions:
        result.append({
            "session_id": session.id,
            "division_name": session.division.name,
            "batch_name": session.batch.name if session.batch else None,
            "subject_name": session.subject.name,
            "session_type": session.session_type,
            "start_time": str(session.start_time),
            "end_time": str(session.end_time),
            "room_number": session.room_number
        })
    
    return result


@router.post("/open-session/{timetable_session_id}")
def open_attendance_session(
    timetable_session_id: int,
    staff_id: int,
    db: Session = Depends(get_db)
):
    """
    Open an attendance session for a timetable session.
    
    Students can start marking attendance after this is opened.
    """
    attendance_session = AttendanceService.open_attendance_session(
        db, timetable_session_id, staff_id
    )
    
    if not attendance_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session already opened or invalid timetable session"
        )
    
    return {
        "message": "Attendance session opened successfully",
        "attendance_session_id": attendance_session.id,
        "date": str(attendance_session.date),
        "session_start_time": str(attendance_session.session_start_time),
        "session_end_time": str(attendance_session.session_end_time)
    }


@router.post("/mark-attendance/{attendance_session_id}")
async def mark_attendance_with_face(
    attendance_session_id: int,
    image: UploadFile = File(...),
    staff_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Mark attendance for a student using face recognition (AI Feature).
    
    Process:
    1. Student shows face to camera
    2. System recognizes student (AI)
    3. System verifies student belongs to this session
    4. System calculates status (present/late) based on time
    5. Attendance is marked
    
    Note: staff_id is optional - if not provided, uses session's staff_id
    """
    # Read image data
    image_data = await image.read()
    
    # Authenticate student via face
    student_auth = AuthService.authenticate_with_face(db, image_data)
    
    if not student_auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Face not recognized"
        )
    
    student_id = student_auth["student_id"]
    
    # If staff_id not provided, get it from the attendance session
    if staff_id is None:
        session = db.query(AttendanceSession).filter(
            AttendanceSession.id == attendance_session_id
        ).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance session not found"
            )
        staff_id = session.staff_id
    
    # Mark attendance
    record = AttendanceService.mark_student_attendance(
        db, attendance_session_id, student_id, staff_id
    )
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already marked, session closed, or you don't belong to this class"
        )
    
    return {
        "message": "Attendance marked successfully",
        "student_id": record.student_id,
        "student_name": student_auth["name"],
        "roll_number": student_auth["roll_number"],
        "status": record.status.upper(),
        "marked_at": str(record.marked_at)
    }


@router.post("/mark-attendance/{attendance_session_id}/manual")
def mark_attendance_manual(
    attendance_session_id: int,
    staff_id: int,
    request: MarkAttendanceRequest,
    db: Session = Depends(get_db)
):
    """
    Mark attendance manually (fallback without face scan).
    For demo/testing purposes only.
    """
    record = AttendanceService.mark_student_attendance(
        db, attendance_session_id, request.student_id, staff_id
    )
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already marked or session closed"
        )
    
    # Get student info
    from app.models import Student
    student = db.query(Student).filter(Student.id == request.student_id).first()
    
    return {
        "message": "Attendance marked successfully",
        "student_id": record.student_id,
        "student_name": f"{student.first_name} {student.last_name}",
        "roll_number": student.roll_number,
        "status": record.status.upper(),
        "marked_at": str(record.marked_at)
    }


@router.post("/close-session/{attendance_session_id}")
def close_attendance_session(
    attendance_session_id: int,
    staff_id: int,
    db: Session = Depends(get_db)
):
    """
    Close attendance session.
    
    Automatically marks all unmarked students as ABSENT.
    """
    success = AttendanceService.close_attendance_session(
        db, attendance_session_id, staff_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session already closed or invalid"
        )
    
    return {"message": "Attendance session closed successfully"}


@router.get("/session-status/{attendance_session_id}")
def get_session_status(attendance_session_id: int, db: Session = Depends(get_db)):
    """Get current status of an attendance session."""
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == attendance_session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get marked students count
    marked_count = len(session.attendance_records)
    
    # Get total students in the division (Theory only)
    timetable_session = session.timetable_session
    from app.models import Student
    total_count = db.query(Student).filter(
        Student.division_id == timetable_session.division_id
    ).count()
    
    return {
        "session_id": session.id,
        "status": session.status,
        "date": str(session.date),
        "marked_count": marked_count,
        "total_count": total_count,
        "remaining": total_count - marked_count
    }


@router.get("/my-timetable/{staff_id}")
def get_my_timetable(staff_id: int, db: Session = Depends(get_db)):
    """Get weekly timetable for staff member."""
    timetable = TimetableService.get_weekly_timetable_for_staff(db, staff_id)
    
    result = {}
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    for day, sessions in timetable.items():
        result[day_names[day]] = [
            {
                "session_id": s.id,
                "subject": s.subject.name,
                "division": s.division.name,
                "batch": s.batch.name if s.batch else None,
                "type": s.session_type,
                "start_time": str(s.start_time),
                "end_time": str(s.end_time),
                "room": s.room_number
            }
            for s in sessions
        ]
    
    return result


@router.get("/open-sessions")
def get_open_attendance_sessions(division_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Get currently open attendance sessions (public endpoint).
    
    This allows students to see which sessions are accepting attendance.
    If division_id is provided, filters to only that division's sessions.
    
    Returns sessions that are:
    - Status = 'open'
    - Not yet closed
    - Theory sessions only (no lab/batch sessions)
    """
    from datetime import date
    
    query = db.query(AttendanceSession).join(
        TimetableSession
    ).filter(
        AttendanceSession.status == "open",
        AttendanceSession.date == date.today()
    )
    
    # Filter by division if provided
    if division_id:
        query = query.filter(TimetableSession.division_id == division_id)
    
    open_sessions = query.all()
    
    result = []
    for session in open_sessions:
        timetable = session.timetable_session
        result.append({
            "attendance_session_id": session.id,
            "subject": timetable.subject.name,
            "division": timetable.division.name,
            "division_id": timetable.division_id,
            "session_type": timetable.session_type,
            "start_time": str(session.session_start_time),
            "end_time": str(session.session_end_time),
            "date": str(session.date),
            "staff_name": f"{session.staff.first_name} {session.staff.last_name}"
        })
    
    return result
