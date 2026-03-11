"""
Parent Model - Represents parent/guardian accounts.
Linked to one or more students for viewing attendance.
Supports multiple children across different departments/divisions/years.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class RelationType(str, enum.Enum):
    """Parent relation types."""
    FATHER = "father"
    MOTHER = "mother"
    GUARDIAN = "guardian"


class Parent(Base):
    """
    Parent model for viewing student attendance.
    Created by Admin and linked to one or more students.
    Authentication: Username + Password
    """
    __tablename__ = "parents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    # Keep student_id for backward compatibility (primary/first child)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(15), nullable=False)
    relation = Column(String(20), nullable=True)  # father, mother, guardian
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="parent")
    student = relationship("Student", back_populates="parents", foreign_keys=[student_id])
    # Multi-child support via association table
    parent_students = relationship("ParentStudent", back_populates="parent", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Parent(id={self.id}, name='{self.first_name} {self.last_name}')>"
