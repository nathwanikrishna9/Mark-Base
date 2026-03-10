"""
Admin API endpoints for system management.
Handles creation of departments, classes, divisions, users, etc.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from app.core.database import get_db
from app.models import (
    User, Department, Class, Division, Batch, Subject,
    Staff, Student, Parent, DailyAttendance
)
from app.utils.security import get_password_hash
import asyncio
from app.websocket_manager import manager


router = APIRouter(prefix="/api/admin", tags=["Admin"])


# Request Models
class CreateDepartmentRequest(BaseModel):
    name: str
    code: str


class CreateClassRequest(BaseModel):
    name: str
    department_id: int


class CreateDivisionRequest(BaseModel):
    name: str
    class_id: int


class CreateBatchRequest(BaseModel):
    name: str
    division_id: int


class CreateSubjectRequest(BaseModel):
    name: str
    code: str
    class_id: int


class CreateStaffRequest(BaseModel):
    username: str
    password: str
    staff_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: int


class UpdateStaffRequest(BaseModel):
    staff_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None


class CreateStudentRequest(BaseModel):
    username: str
    roll_number: str
    enrollment_number: Optional[str] = None
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: int 
    class_id: int  
    division_id: int  
    batch_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    enrollment_year: Optional[int] = None


class UpdateStudentRequest(BaseModel):
    roll_number: Optional[str] = None
    enrollment_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    class_id: Optional[int] = None
    division_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    enrollment_year: Optional[int] = None


class CreateParentRequest(BaseModel):
    username: str
    password: str
    student_id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: str
    relation: str


class UpdateParentRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    relation: Optional[str] = None


class UpdateAttendanceRequest(BaseModel):
    student_id: int
    date: str  # Format: "YYYY-MM-DD"
    status: str  # "present", "absent", "late"
    reason: Optional[str] = None
    admin_id: Optional[int] = None
    notes: Optional[str] = None  # Max 500 chars


class BulkUpdateAttendanceRequest(BaseModel):
    division_id: int
    date: str  # Format: "YYYY-MM-DD"
    status: str  # "present", "absent", "late"
    admin_id: Optional[int] = None
    student_ids: Optional[List[int]] = None  # None = all students in division
    only_unmarked: bool = False  # If true, only update students without a record


# ==================== DEPARTMENT ENDPOINTS ====================
@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    """Get all departments."""
    departments = db.query(Department).all()
    return departments


@router.post("/departments")
def create_department(request: CreateDepartmentRequest, db: Session = Depends(get_db)):
    """Create a new department."""
    # Check if department with same code already exists
    existing = db.query(Department).filter(Department.code == request.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this code already exists"
        )
    
    department = Department(
        name=request.name,
        code=request.code
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    
    return department


# ==================== CLASS ENDPOINTS ====================
@router.get("/classes")
def get_classes(department_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all classes, optionally filtered by department."""
    query = db.query(Class)
    if department_id:
        query = query.filter(Class.department_id == department_id)
    classes = query.all()
    return classes


@router.post("/classes")
def create_class(request: CreateClassRequest, db: Session = Depends(get_db)):
    """Create a new class."""
    # Validate department exists
    department = db.query(Department).filter(Department.id == request.department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    class_obj = Class(
        name=request.name,
        department_id=request.department_id
    )
    db.add(class_obj)
    db.commit()
    db.refresh(class_obj)
    
    return class_obj


# ==================== DIVISION ENDPOINTS ====================
@router.get("/divisions")
def get_divisions(class_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all divisions, optionally filtered by class."""
    query = db.query(Division)
    if class_id:
        query = query.filter(Division.class_id == class_id)
    divisions = query.all()
    print(divisions)
    return divisions


@router.post("/divisions")
def create_division(request: CreateDivisionRequest, db: Session = Depends(get_db)):
    """Create a new division."""
    # Validate class exists
    class_obj = db.query(Class).filter(Class.id == request.class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    division = Division(
        name=request.name,
        class_id=request.class_id
    )
    db.add(division)
    db.commit()
    db.refresh(division)
    
    return division


# ==================== BATCH ENDPOINTS ====================
@router.get("/batches")
def get_batches(division_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all batches, optionally filtered by division."""
    query = db.query(Batch)
    if division_id:
        query = query.filter(Batch.division_id == division_id)
    batches = query.all()
    return batches


@router.post("/batches")
def create_batch(request: CreateBatchRequest, db: Session = Depends(get_db)):
    """Create a new batch."""
    # Validate division exists
    division = db.query(Division).filter(Division.id == request.division_id).first()
    if not division:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Division not found"
        )
    
    batch = Batch(
        name=request.name,
        division_id=request.division_id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    return batch


# ==================== SUBJECT ENDPOINTS ====================
@router.get("/subjects")
def get_subjects(class_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all subjects, optionally filtered by class."""
    query = db.query(Subject)
    if class_id:
        query = query.filter(Subject.class_id == class_id)
    subjects = query.all()
    return subjects


@router.post("/subjects")
def create_subject(request: CreateSubjectRequest, db: Session = Depends(get_db)):
    """Create a new subject."""
    # Validate class exists
    class_obj = db.query(Class).filter(Class.id == request.class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Check if subject with same code already exists for this class
    existing = db.query(Subject).filter(
        Subject.code == request.code,
        Subject.class_id == request.class_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject with this code already exists for this class"
        )
    
    subject = Subject(
        name=request.name,
        code=request.code,
        class_id=request.class_id
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    
    return subject


# ==================== STAFF ENDPOINTS ====================
@router.get("/staff")
def get_staff(department_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all staff members, optionally filtered by department."""
    query = db.query(Staff)
    if department_id:
        query = query.filter(Staff.department_id == department_id)
    staff = query.all()
    return staff


@router.post("/staff")
def create_staff(request: CreateStaffRequest, db: Session = Depends(get_db)):
    """Create a new staff member."""
    # Validate department exists
    department = db.query(Department).filter(Department.id == request.department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Create user account
    user = User(
        username=request.username,
        password_hash=get_password_hash(request.password),
        role="staff"
    )
    db.add(user)
    db.flush()

    # Create staff profile
    staff = Staff(
        user_id=user.id,
        staff_id=request.staff_id,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        department_id=request.department_id
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)

    return staff


@router.put("/staff/{staff_id}")
def update_staff(staff_id: int, request: UpdateStaffRequest, db: Session = Depends(get_db)):
    """Update a staff member's details."""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Update only provided fields
    if request.staff_id is not None:
        staff.staff_id = request.staff_id
    if request.first_name is not None:
        staff.first_name = request.first_name
    if request.last_name is not None:
        staff.last_name = request.last_name
    if request.email is not None:
        staff.email = request.email
    if request.phone is not None:
        staff.phone = request.phone
    if request.department_id is not None:
        # Validate department exists
        department = db.query(Department).filter(Department.id == request.department_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        staff.department_id = request.department_id
    
    db.commit()
    db.refresh(staff)
    return staff


@router.get("/staff/{staff_id}")
def get_staff_by_id(staff_id: int, db: Session = Depends(get_db)):
    """Get a specific staff member by ID with division info."""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Get division and class info if assigned
    division_name = None
    class_name = None
    if staff.division_id:
        division = db.query(Division).filter(Division.id == staff.division_id).first()
        if division:
            division_name = division.name
            class_obj = db.query(Class).filter(Class.id == division.class_id).first()
            if class_obj:
                class_name = class_obj.name
    
    return {
        "id": staff.id,
        "staff_id": staff.staff_id,
        "first_name": staff.first_name,
        "last_name": staff.last_name,
        "email": staff.email,
        "phone": staff.phone,
        "department_id": staff.department_id,
        "division_id": staff.division_id,
        "division_name": division_name,
        "class_name": class_name,
        "username": staff.user.username if staff.user else None
    }


# ==================== STUDENT ENDPOINTS ====================
@router.get("/students")
def get_students(
    division_id: Optional[int] = None,
    class_id: Optional[int] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all students, optionally filtered by division, class, or department."""
    query = db.query(Student)
    if division_id:
        query = query.filter(Student.division_id == division_id)
    elif class_id:
        query = query.join(Division).filter(Division.class_id == class_id)
    elif department_id:
        query = query.join(Division).join(Class).filter(Class.department_id == department_id)
    
    students = query.all()
    return students


@router.post("/students")
def create_student(request: CreateStudentRequest, db: Session = Depends(get_db)):
    """Create a new student (face registration happens on first login)."""
    # Validate department, class, and division exist
    department = db.query(Department).filter(Department.id == request.department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    class_obj = db.query(Class).filter(
        Class.id == request.class_id,
        Class.department_id == request.department_id
    ).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found or does not belong to specified department"
        )
    
    division = db.query(Division).filter(
        Division.id == request.division_id,
        Division.class_id == request.class_id
    ).first()
    if not division:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Division not found or does not belong to specified class"
        )
    
    # Check if username already exists to prevent integrity errors
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Create user account (Students use face recognition, but DB may require a password_hash)
    user = User(
        username=request.username,
        password_hash="FACE_AUTH_ONLY", # Placeholder if column is NOT NULL
        role="student"
    )
    db.add(user)
    db.flush()
    
    # Create student profile
    student = Student(
        user_id=user.id,
        roll_number=request.roll_number,
        enrollment_number=request.enrollment_number,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        division_id=request.division_id,
        batch_id=request.batch_id,
        date_of_birth=request.date_of_birth,
        enrollment_year=request.enrollment_year,
        face_registered=False
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    
    return student


@router.put("/students/{student_id}")
def update_student(student_id: int, request: UpdateStudentRequest, db: Session = Depends(get_db)):
    """Update a student's details."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Validate new division/class/department if provided
    if request.division_id is not None:
        division = db.query(Division).filter(Division.id == request.division_id).first()
        if not division:
            raise HTTPException(status_code=404, detail="Division not found")
        student.division_id = request.division_id
    
    # Update only provided fields
    if request.roll_number is not None:
        student.roll_number = request.roll_number
    if request.enrollment_number is not None:
        student.enrollment_number = request.enrollment_number
    if request.first_name is not None:
        student.first_name = request.first_name
    if request.last_name is not None:
        student.last_name = request.last_name
    if request.email is not None:
        student.email = request.email
    if request.phone is not None:
        student.phone = request.phone
    if request.date_of_birth is not None:
        student.date_of_birth = request.date_of_birth
    if request.enrollment_year is not None:
        student.enrollment_year = request.enrollment_year
    
    db.commit()
    db.refresh(student)
    return student
@router.get("/parents")
def get_parents(student_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all parents, optionally filtered by student."""
    query = db.query(Parent)
    if student_id:
        query = query.filter(Parent.student_id == student_id)
    parents = query.all()
    return parents


@router.post("/parents")
def create_parent(request: CreateParentRequest, db: Session = Depends(get_db)):
    """Create a new parent account."""
    # Validate student exists
    student = db.query(Student).filter(Student.id == request.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create user account
    user = User(
        username=request.username,
        password_hash=get_password_hash(request.password),
        role="parent"
    )
    db.add(user)
    db.flush()
    
    # Create parent profile
    parent = Parent(
        user_id=user.id,
        student_id=request.student_id,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        relation=request.relation
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)
    
    return parent


@router.put("/parents/{parent_id}")
def update_parent(parent_id: int, request: UpdateParentRequest, db: Session = Depends(get_db)):
    """Update a parent's details."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    
    # Update only provided fields
    if request.first_name is not None:
        parent.first_name = request.first_name
    if request.last_name is not None:
        parent.last_name = request.last_name
    if request.email is not None:
        parent.email = request.email
    if request.phone is not None:
        parent.phone = request.phone
    if request.relation is not None:
        parent.relation = request.relation
    
    db.commit()
    db.refresh(parent)
    return parent


# ==================== ATTENDANCE MANAGEMENT ENDPOINTS ====================

@router.get("/analytics")
def get_attendance_analytics(days: int = 30, db: Session = Depends(get_db)):
    """
    Get aggregated day-wise analytics for the past 'n' days grouped by Departments.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    end_date = datetime.today().date()
    start_date = end_date - timedelta(days=days)
    
    # We join DailyAttendance -> Student -> Division -> Class -> Department
    records = db.query(
        DailyAttendance.date,
        Department.name.label("department"),
        DailyAttendance.status,
        func.count(DailyAttendance.id).label("count")
    ).join(
        Student, Student.id == DailyAttendance.student_id
    ).join(
        Division, Division.id == Student.division_id
    ).join(
        Class, Class.id == Division.class_id
    ).join(
        Department, Department.id == Class.department_id
    ).filter(
        DailyAttendance.date >= start_date,
        DailyAttendance.date <= end_date
    ).group_by(
        DailyAttendance.date,
        Department.name,
        DailyAttendance.status
    ).all()
    
    # Process into daily arrays
    # Dict form: {date: {department: {total: 0, present: 0, absent: 0, late: 0}}}
    aggregated = {}
    
    for row in records:
        date_str = str(row.date)
        dept = row.department
        status = row.status
        count = row.count
        
        if date_str not in aggregated:
            aggregated[date_str] = {}
            
        if dept not in aggregated[date_str]:
            aggregated[date_str][dept] = {"total": 0, "present": 0, "absent": 0, "late": 0}
            
        aggregated[date_str][dept][status] += count
        aggregated[date_str][dept]["total"] += count
        
    # Flatten strictly for the UI analytics engine dataset structure:
    # { date: string, department: string, present: number, total: number, absent: number, late: number }
    output = []
    
    for date_str, depts in aggregated.items():
        for dept, stats in depts.items():
            output.append({
                "date": date_str,
                "department": dept,
                "present": stats["present"],
                "absent": stats["absent"],
                "late": stats["late"],
                "total": stats["total"]
            })
            
    # Always sort ascending chronological
    output.sort(key=lambda x: x["date"])

    return output


@router.put("/attendance")
def update_attendance(request: UpdateAttendanceRequest, db: Session = Depends(get_db)):
    """
    Admin can update attendance for a student on a specific date.
    Can mark students as present even if they didn't mark their attendance.
    """
    from datetime import datetime
    
    try:
        attendance_date = datetime.strptime(request.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Prevent future dates
    if attendance_date > date.today():
        raise HTTPException(status_code=400, detail="Cannot mark attendance for a future date")
    
    # Validate notes length
    if request.notes and len(request.notes) > 500:
        raise HTTPException(status_code=400, detail="Notes must be 500 characters or fewer")
    
    # Validate student exists
    student = db.query(Student).filter(Student.id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Validate status
    if request.status not in ["present", "absent", "late"]:
        raise HTTPException(status_code=400, detail="Status must be 'present', 'absent', or 'late'")
    
    # Check if attendance record exists for this date
    existing = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == request.student_id,
        DailyAttendance.date == attendance_date
    ).first()
    
    # Determine check-in time based on status (aligned to current attendance window)
    from datetime import time as dt_time
    if request.status == "present":
        check_time = dt_time(12, 0)  # On-time (within present window)
    elif request.status == "late":
        check_time = dt_time(12, 16)  # Late (within late window)
    else:
        check_time = dt_time(23, 59)  # Absent - end of day
    
    if existing:
        # Update existing record with audit trail
        existing.status = request.status
        existing.check_in_time = check_time
        existing.marked_method = "manual"
        existing.edited_by = request.admin_id
        existing.edited_at = datetime.utcnow()
        if request.notes is not None:
            existing.notes = request.notes
    else:
        # Create new attendance record
        attendance = DailyAttendance(
            student_id=request.student_id,
            division_id=student.division_id,
            date=attendance_date,
            check_in_time=check_time,
            status=request.status,
            marked_by=None,  # Admin override
            marked_method="manual",
            notes=request.notes
        )
        db.add(attendance)
    
    db.commit()
    
    # Broadcast WS update
    asyncio.run(manager.broadcast({
        "type": "ATTENDANCE_UPDATE",
        "student_id": request.student_id,
        "date": str(attendance_date),
        "status": request.status,
        "check_in_time": str(check_time),
        "marked_method": "manual"
    }, f"{student.division_id}_{str(attendance_date)}"))
    
    return {
        "message": f"Attendance updated to '{request.status}'",
        "student_id": request.student_id,
        "date": request.date,
        "status": request.status
    }


@router.get("/attendance/division/{division_id}/{date}")
def get_division_attendance_for_admin(
    division_id: int,
    date: str,
    db: Session = Depends(get_db)
):
    """Get all attendance records for a division on a specific date (admin view)."""
    from datetime import datetime
    from app.models import DailyAttendance
    
    try:
        attendance_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Validate division exists
    division = db.query(Division).filter(Division.id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    
    # Get all students in division
    students = db.query(Student).filter(Student.division_id == division_id).all()
    
    attendance_records = []
    
    # Optional logic to sync auto-absent bounds
    from app.models import AttendanceSession
    from datetime import time
    session = db.query(AttendanceSession).filter(
        AttendanceSession.division_id == division_id,
        AttendanceSession.date == attendance_date
    ).first()
    
    late_cutoff_passed = False
    if date == str(datetime.today().date()):
        if datetime.now().time() >= time(12, 20):
            late_cutoff_passed = True
    elif date < str(datetime.today().date()):
        late_cutoff_passed = True # Past days are implicitly closed

    is_closed = (session and session.status == 'closed') or late_cutoff_passed

    for student in students:
        attendance = db.query(DailyAttendance).filter(
            DailyAttendance.student_id == student.id,
            DailyAttendance.date == attendance_date
        ).first()
        
        final_status = "unmarked"
        if attendance:
            final_status = attendance.status
        elif is_closed:
            final_status = "absent"
            
        attendance_records.append({
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "roll_number": student.roll_number,
            "status": final_status,
            "check_in_time": str(attendance.check_in_time) if attendance else None,
            "marked_method": attendance.marked_method if attendance else None,
            "notes": attendance.notes if attendance else None,
            "edited_by": attendance.edited_by if attendance else None,
            "edited_at": str(attendance.edited_at) if attendance and attendance.edited_at else None,
        })
    
    return {
        "division_id": division_id,
        "division_name": division.name,
        "date": date,
        "total_students": len(students),
        "present_count": len([r for r in attendance_records if r["status"] == "present"]),
        "absent_count": len([r for r in attendance_records if r["status"] == "absent"]),
        "late_count": len([r for r in attendance_records if r["status"] == "late"]),
        "unmarked_count": len([r for r in attendance_records if r["status"] == "unmarked"]),
        "records": attendance_records
    }


@router.put("/attendance/bulk")
def bulk_update_attendance(request: BulkUpdateAttendanceRequest, db: Session = Depends(get_db)):
    """
    Bulk update attendance for a division on a specific date.
    Supports marking all students or only unmarked ones.
    """
    from datetime import datetime, time as dt_time

    try:
        attendance_date = datetime.strptime(request.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Prevent future dates
    if attendance_date > date.today():
        raise HTTPException(status_code=400, detail="Cannot mark attendance for a future date")

    if request.status not in ["present", "absent", "late"]:
        raise HTTPException(status_code=400, detail="Status must be 'present', 'absent', or 'late'")

    # Validate division exists
    division = db.query(Division).filter(Division.id == request.division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")

    # Determine check-in time
    time_map = {"present": dt_time(12, 0), "late": dt_time(12, 16), "absent": dt_time(23, 59)}
    check_time = time_map[request.status]

    # Get target students
    query = db.query(Student).filter(Student.division_id == request.division_id)
    if request.student_ids:
        query = query.filter(Student.id.in_(request.student_ids))
    students = query.all()

    updated = 0
    skipped = 0
    for student in students:
        existing = db.query(DailyAttendance).filter(
            DailyAttendance.student_id == student.id,
            DailyAttendance.date == attendance_date
        ).first()

        if existing and request.only_unmarked:
            skipped += 1
            continue

        if existing:
            existing.status = request.status
            existing.check_in_time = check_time
            existing.marked_method = "manual"
            existing.edited_by = request.admin_id
            existing.edited_at = datetime.utcnow()
        else:
            db.add(DailyAttendance(
                student_id=student.id,
                division_id=request.division_id,
                date=attendance_date,
                check_in_time=check_time,
                status=request.status,
                marked_method="manual"
            ))
        updated += 1

    db.commit()
    
    # Broadcast empty/generic WS update for bulk reload
    asyncio.run(manager.broadcast({
        "type": "ATTENDANCE_BULK_UPDATE",
        "date": str(attendance_date),
        "division_id": request.division_id
    }, f"{request.division_id}_{str(attendance_date)}"))
    
    return {"updated": updated, "skipped": skipped, "total": len(students)}


# ==================== DELETE ENDPOINTS ====================

@router.delete("/departments/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db)):
    """Delete a department and all related data."""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    try:
        db.delete(department)
        db.commit()
        return {"message": "Department deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete department: {str(e)}"
        )


@router.delete("/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db)):
    """Delete a class and all related data."""
    class_obj = db.query(Class).filter(Class.id == class_id).first()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    try:
        # Check if there are students in any division of this class
        divisions = db.query(Division).filter(Division.class_id == class_id).all()
        student_count = 0
        for div in divisions:
            count = db.query(Student).filter(Student.division_id == div.id).count()
            student_count += count
        
        if student_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete class: {student_count} student(s) are enrolled in this class. Please delete or reassign students first."
            )
        
        # Delete the class (cascades to divisions, subjects, etc.)
        db.delete(class_obj)
        db.commit()
        return {"message": "Class deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete class: {str(e)}"
        )


@router.delete("/divisions/{division_id}")
def delete_division(division_id: int, db: Session = Depends(get_db)):
    """Delete a division and all related data."""
    division = db.query(Division).filter(Division.id == division_id).first()
    if not division:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Division not found"
        )
    
    try:
        # Check if there are students in this division
        student_count = db.query(Student).filter(Student.division_id == division_id).count()
        
        if student_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete division: {student_count} student(s) are enrolled. Please delete or reassign students first."
            )
        
        # Delete the division (cascades to batches, timetable sessions, etc.)
        db.delete(division)
        db.commit()
        return {"message": "Division deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete division: {str(e)}"
        )


@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    """Delete a student and all related data."""
    from app.models import DailyAttendance
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    try:
        # 1. Delete parent accounts and their user records first
        parents = db.query(Parent).filter(Parent.student_id == student_id).all()
        for parent in parents:
            if parent.user_id:
                parent_user = db.query(User).filter(User.id == parent.user_id).first()
                if parent_user:
                    db.delete(parent_user)
            db.delete(parent)
        
        # 2. Delete attendance records
        db.query(DailyAttendance).filter(DailyAttendance.student_id == student_id).delete()
        
        # 3. Delete leave requests
        from app.models import LeaveRequest
        db.query(LeaveRequest).filter(LeaveRequest.student_id == student_id).delete()
        
        # 4. Save user_id before deleting student
        user_id = student.user_id
        
        # 5. Delete student
        db.delete(student)
        db.flush()
        
        # 6. Delete associated user account
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.delete(user)
        
        db.commit()
        return {"message": "Student deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete student: {str(e)}"
        )


@router.delete("/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    """Delete a staff member and all related data."""
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff not found"
        )
    
    try:
        # Save user_id before deleting staff
        user_id = staff.user_id
        
        # Delete staff first
        db.delete(staff)
        db.flush()
        
        # Then delete associated user account
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.delete(user)
        
        db.commit()
        return {"message": "Staff deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete staff: {str(e)}"
        )


@router.delete("/parents/{parent_id}")
def delete_parent(parent_id: int, db: Session = Depends(get_db)):
    """Delete a parent and all related data."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent not found"
        )
    
    try:
        # Save user_id before deleting parent
        user_id = parent.user_id
        
        # Delete parent first
        db.delete(parent)
        db.flush()
        
        # Then delete associated user account
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.delete(user)
        
        db.commit()
        return {"message": "Parent deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete parent: {str(e)}"
        )



