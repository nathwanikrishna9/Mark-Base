"""
Student Model - Represents students enrolled in the system.
Linked to User table with face recognition authentication.
"""

from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Student(Base):
    """
    Student model for enrolled students.
    Authentication: Face Recognition only (AI Feature)
    """
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    roll_number = Column(String(20), unique=True, nullable=False, index=True)
    enrollment_number = Column(String(50), nullable=True)  # Add enrollment number field
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(15), nullable=True)
    division_id = Column(Integer, ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    enrollment_year = Column(Integer, nullable=True)
    face_registered = Column(Boolean, default=False)  # Indicates if face is captured
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="student")
    division = relationship("Division", back_populates="students")
    batch = relationship("Batch", back_populates="students")
    parents = relationship("Parent", back_populates="student")
    
    # Legacy lecture-based attendance
    attendance_records = relationship("AttendanceRecord", back_populates="student")
    
    # NEW: Day-wise attendance
    daily_attendance = relationship("DailyAttendance", back_populates="student", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="student", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Student(id={self.id}, roll='{self.roll_number}', name='{self.first_name} {self.last_name}')>"
