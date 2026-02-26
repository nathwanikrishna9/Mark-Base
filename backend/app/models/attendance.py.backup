"""
Attendance Models - Session and Record management.
Implements grace period logic and status assignment.
"""

from sqlalchemy import Column, Integer, String, DateTime, Date, Time, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class SessionStatus(str, enum.Enum):
    """Attendance session status."""
    OPEN = "open"
    CLOSED = "closed"


class AttendanceStatus(str, enum.Enum):
    """Individual attendance status with grace period logic."""
    PRESENT = "present"  # Marked within 15 minutes of session start
    LATE = "late"        # Marked after 15 minutes but before session end
    ABSENT = "absent"    # Not marked by session end (auto-assigned)


class AttendanceSession(Base):
    """
    Attendance session opened by staff for a specific timetable session.
    
    Flow:
    1. Staff logs in
    2. System detects active timetable session
    3. Staff opens attendance session
    4. Students mark attendance (face scan)
    5. Staff closes session
    6. System auto-marks remaining students as absent
    """
    __tablename__ = "attendance_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    timetable_session_id = Column(Integer, ForeignKey("timetable_sessions.id", ondelete="CASCADE"), nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    session_start_time = Column(Time, nullable=False)
    session_end_time = Column(Time, nullable=False)
    opened_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="open", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    timetable_session = relationship("TimetableSession", back_populates="attendance_sessions")
    staff = relationship("Staff", back_populates="attendance_sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="attendance_session", cascade="all, delete-orphan")
    
    # Unique constraint: One attendance session per timetable session per day
    __table_args__ = (
        UniqueConstraint('timetable_session_id', 'date', name='uq_attendance_session_timetable_date'),
    )
    
    def __repr__(self):
        return f"<AttendanceSession(id={self.id}, date={self.date}, status='{self.status}')>"


class AttendanceRecord(Base):
    """
    Individual student attendance record within a session.
    
    Status Logic (Automatic):
    - PRESENT: Marked from session_start_time to session_start_time + 15 minutes
    - LATE: Marked after 15 minutes until session_end_time
    - ABSENT: Not marked by session end (auto-assigned when session closes)
    
    Rules:
    - Status is assigned automatically based on marking time
    - Staff cannot override status
    - Admin can edit during the same day only
    - No duplicate marking (enforced by unique constraint)
    """
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    marked_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(10), nullable=False)  # present, late, absent
    marked_by = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False)
    edited_by = Column(Integer, nullable=True)  # Admin ID if edited
    edited_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    attendance_session = relationship("AttendanceSession", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")
    
    # Unique constraint: One record per student per session
    __table_args__ = (
        UniqueConstraint('attendance_session_id', 'student_id', name='uq_attendance_record_session_student'),
    )
    
    def __repr__(self):
        return f"<AttendanceRecord(id={self.id}, student_id={self.student_id}, status='{self.status}')>"
