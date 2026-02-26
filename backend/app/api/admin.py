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
    Staff, Student, Parent, TimetableSession
)
from app.utils.security import get_password_hash


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
    class_id: Optional[int] = None
    division_id: Optional[int] = None


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


class CreateParentRequest(BaseModel):
    username: str
    password: str
    student_id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: str
    relation: str


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
        "username": staff.username
    }
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
        department_id=request.department_id,
        class_id=request.class_id,
        division_id=request.division_id
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    
    return staff


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


# ==================== PARENT ENDPOINTS ====================
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
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    try:
        # Delete associated user account
        if student.user_id:
            user = db.query(User).filter(User.id == student.user_id).first()
            if user:
                db.delete(user)
        
        db.delete(student)
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
        # Check if staff has timetable sessions assigned
        session_count = db.query(TimetableSession).filter(TimetableSession.staff_id == staff_id).count()
        
        if session_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete staff: {session_count} timetable session(s) are assigned to this staff member. Please reassign or delete the sessions first."
            )
        
        # Delete associated user account
        if staff.user_id:
            user = db.query(User).filter(User.id == staff.user_id).first()
            if user:
                db.delete(user)
        
        db.delete(staff)
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
        # Delete associated user account
        if parent.user_id:
            user = db.query(User).filter(User.id == parent.user_id).first()
            if user:
                db.delete(user)
        
        db.delete(parent)
        db.commit()
        return {"message": "Parent deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete parent: {str(e)}"
        )
