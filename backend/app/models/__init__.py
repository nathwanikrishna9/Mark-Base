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
from .timetable import TimetableSession
from .attendance import (
    AttendanceSession, 
    AttendanceRecord,
    DailyAttendance,
    GracePeriod,
    LeaveRequest
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
    "TimetableSession",
    # Legacy lecture-based
    "AttendanceSession",
    "AttendanceRecord",
    # NEW: Day-wise attendance
    "DailyAttendance",
    "GracePeriod",
    "LeaveRequest",
]