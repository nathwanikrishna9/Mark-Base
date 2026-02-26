"""
Division Model - Represents class divisions/sections.
Example: Division A, B, C within a class
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Division(Base):
    """
    Division model representing sections within a class.
    Each division has its own timetable.
    """
    __tablename__ = "divisions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(10), nullable=False)  # A, B, C, etc.
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    class_ = relationship("Class", back_populates="divisions")
    batches = relationship("Batch", back_populates="division", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="division")
    timetable_sessions = relationship("TimetableSession", back_populates="division")
    
    # NEW: Day-wise attendance
    daily_attendance = relationship("DailyAttendance", back_populates="division", cascade="all, delete-orphan")
    grace_periods = relationship("GracePeriod", back_populates="division", cascade="all, delete-orphan")
    
    # Unique constraint: One division name per class
    __table_args__ = (
        UniqueConstraint('class_id', 'name', name='uq_division_class_name'),
    )
    
    def __repr__(self):
        return f"<Division(id={self.id}, name='{self.name}', class_id={self.class_id})>"
