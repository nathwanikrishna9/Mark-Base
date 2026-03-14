"""
Authentication API endpoints.
Handles login for all user roles with different authentication methods.
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.services.auth_service import AuthService


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# Request/Response Models
class LoginRequest(BaseModel):
    """Login request with username and password."""
    username: str
    password: str


class LoginResponse(BaseModel):
    """Login response with user info and token."""
    user_id: int
    username: str
    role: str
    token: str
    name: Optional[str] = None
    staff_id: Optional[int] = None
    student_id: Optional[int] = None
    parent_id: Optional[int] = None
    linked_student_id: Optional[int] = None
    children: Optional[list] = None


class FaceLoginResponse(BaseModel):
    """Face login response for students."""
    user_id: int
    student_id: int
    username: str
    roll_number: str
    name: str
    role: str
    token: str
    confidence: float


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with username and password.
    
    Used by: Admin, Staff, Parent
    """
    result = AuthService.authenticate_with_password(
        db, request.username, request.password
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    return result


@router.post("/login/face", response_model=FaceLoginResponse)
async def login_with_face(
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Login with face recognition (AI Feature).
    
    Used by: Students
    
    Upload image from webcam or file for face authentication.
    """
    # Read image data
    image_data = await image.read()
    
    # Authenticate with face
    result = AuthService.authenticate_with_face(db, image_data)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Face not recognized. Please try again."
        )
    
    return result


@router.post("/login/admin/face")
async def admin_login_with_face(
    username: str = Form(...),
    password: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Admin login with username, password, and face verification.
    Extra security layer for admin access.
    """
    image_data = await image.read()
    
    result = AuthService.authenticate_admin_with_face(
        db, username, password, image_data
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )
    
    return result


@router.post("/register-face/{student_id}")
async def register_student_face(
    student_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Register face for a student (first-time setup).
    
    Called during student's first login to capture face encoding.
    """
    image_data = await image.read()
    
    success, message = AuthService.register_student_face(db, student_id, image_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": "Face registered successfully", "student_id": student_id}

@router.post("/check-face-unique")
async def check_face_unique(
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Check if a face is already registered to another user without creating a user
    """
    image_data = await image.read()
    
    success, message = AuthService.check_face_uniqueness(db, image_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": "Face is unique"}
