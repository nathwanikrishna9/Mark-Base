"""
ParentStudent Association Model - Links parents to multiple students (children).
Allows a single parent account to track attendance of multiple children,
even if they are in different departments/divisions/years.
"""

from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ParentStudent(Base):
    """
    Association table linking parents to their children (students).
    A parent can have multiple children, and a student can have multiple parents.
    """
    __tablename__ = "parent_students"
    
    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parents.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    parent = relationship("Parent", back_populates="parent_students")
    student = relationship("Student", back_populates="parent_students")
    
    # Each parent-student pair must be unique
    __table_args__ = (
        UniqueConstraint('parent_id', 'student_id', name='uq_parent_student'),
    )
    
    def __repr__(self):
        return f"<ParentStudent(parent_id={self.parent_id}, student_id={self.student_id})>"
