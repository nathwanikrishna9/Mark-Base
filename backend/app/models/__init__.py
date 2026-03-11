"""
Database models for Markbase application.
All SQLAlchemy models are imported here for easy access.
"""

from .user import User
from .department import Department
from .class_model import Class
from .division import Division
from .batch import Batch
from .subject import Subject
from .staff import Staff
from .student import Student
from .parent import Parent
from .parent_student import ParentStudent
from .attendance import (
    DailyAttendance,
    GracePeriod,
    LeaveRequest,
    AttendanceSession
)

__all__ = [
    "User",
    "Department",
    "Class",
    "Division",
    "Batch",
    "Subject",
    "Staff",
    "Student",
    "Parent",
    "ParentStudent",
    # Day-wise attendance only
    "DailyAttendance",
    "GracePeriod",
    "LeaveRequest",
    "AttendanceSession",
]
