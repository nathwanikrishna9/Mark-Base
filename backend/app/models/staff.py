"""
Staff Model - Represents teaching staff/faculty.
Linked to User table for authentication.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Staff(Base):
    """
    Staff model for faculty members who conduct lectures and mark attendance.
    Each staff has username + password authentication.
    Staff can be assigned as class teachers for specific class and division.
    """
    __tablename__ = "staff"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    staff_id = Column(String(20), unique=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(15), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    division_id = Column(Integer, ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="staff")
    department = relationship("Department", back_populates="staff")
    class_ = relationship("Class", foreign_keys=[class_id])
    division = relationship("Division", foreign_keys=[division_id])
    timetable_sessions = relationship("TimetableSession", back_populates="staff")
    
    # Legacy lecture-based attendance
    attendance_sessions = relationship("AttendanceSession", back_populates="staff")
    
    # NEW: Day-wise attendance - Staff who mark/edit attendance and approve leaves
    # Note: Using string references to avoid circular imports
    marked_attendance = relationship("DailyAttendance", foreign_keys="DailyAttendance.marked_by")
    edited_attendance = relationship("DailyAttendance", foreign_keys="DailyAttendance.edited_by")
    approved_leaves = relationship("LeaveRequest", back_populates="approver")
    
    def __repr__(self):
        return f"<Staff(id={self.id}, staff_id='{self.staff_id}', name='{self.first_name} {self.last_name}')>"
