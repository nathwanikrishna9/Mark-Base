"""
Authentication service for handling login logic.
Supports multiple authentication methods based on user role.
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict
from app.models import User, Student, Staff, ParentStudent
from app.utils.security import verify_password, create_access_token
from app.utils.face_recognition import face_service


class AuthService:
    """
    Authentication service handling role-based login.
    
    Authentication Methods:
    - Admin: Username + Password + Face Recognition (optional)
    - Staff: Username + Password
    - Student: Face Recognition only
    - Parent: Username + Password
    """
    
    @staticmethod
    def authenticate_with_password(db: Session, username: str, password: str) -> Optional[Dict]:
        """
        Authenticate user with username and password.
        Used for: Admin, Staff, Parent
        
        Args:
            db: Database session
            username: Username
            password: Plain password
        
        Returns:
            Dict with user info and token, or None if authentication fails
        """
        # Find user
        user = db.query(User).filter(User.username == username, User.is_active == True).first()
        
        if not user:
            return None
        
        # Verify password
        if not user.password_hash or not verify_password(password, user.password_hash):
            return None
        
        # Generate access token
        token = create_access_token(data={"user_id": user.id, "role": user.role})
        
        # Get additional info based on role
        user_info = {
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "token": token
        }
        
        # Add role-specific information
        if user.role == "staff" and user.staff:
            user_info["staff_id"] = user.staff.id
            user_info["name"] = f"{user.staff.first_name} {user.staff.last_name}"
        elif user.role == "student" and user.student:
            user_info["student_id"] = user.student.id
            user_info["name"] = f"{user.student.first_name} {user.student.last_name}"
        elif user.role == "parent" and user.parent:
            user_info["parent_id"] = user.parent.id
            user_info["name"] = f"{user.parent.first_name} {user.parent.last_name}"
            
            # Get all linked children via association table
            parent_student_links = db.query(ParentStudent).filter(
                ParentStudent.parent_id == user.parent.id
            ).all()
            
            children = []
            for link in parent_student_links:
                student = db.query(Student).filter(Student.id == link.student_id).first()
                if student:
                    division_name = student.division.name if student.division else "N/A"
                    from app.models import Class
                    class_name = ""
                    dept_name = ""
                    if student.division and student.division.class_:
                        class_name = student.division.class_.name
                        if student.division.class_.department:
                            dept_name = student.division.class_.department.name
                    children.append({
                        "student_id": student.id,
                        "name": f"{student.first_name} {student.last_name}",
                        "roll_number": student.roll_number,
                        "division": division_name,
                        "class_name": class_name,
                        "department": dept_name
                    })
            
            # Fallback: if no association records, use the legacy student_id
            if not children and user.parent.student_id:
                student = db.query(Student).filter(Student.id == user.parent.student_id).first()
                if student:
                    division_name = student.division.name if student.division else "N/A"
                    children.append({
                        "student_id": student.id,
                        "name": f"{student.first_name} {student.last_name}",
                        "roll_number": student.roll_number,
                        "division": division_name,
                        "class_name": "",
                        "department": ""
                    })
            
            user_info["children"] = children
            # Set linked_student_id to first child for backward compatibility
            if children:
                user_info["linked_student_id"] = children[0]["student_id"]
        
        return user_info
    
    @staticmethod
    def authenticate_with_face(db: Session, image_data: bytes) -> Optional[Dict]:
        """
        Authenticate student using face recognition (AI Feature).
        Used for: Student login and attendance marking
        
        Args:
            db: Database session
            image_data: Image bytes from webcam/upload
        
        Returns:
            Dict with student info and token, or None if authentication fails
        """
        # Generate face encoding from provided image
        face_encoding = face_service.encode_face_from_image(image_data)
        
        if not face_encoding:
            return None
        
        # Get all students with registered faces
        students = db.query(Student).join(User).filter(
            User.role == "student",
            User.is_active == True,
            Student.face_registered == True,
            User.face_encoding.isnot(None)
        ).all()
        
        # Try to match face with each student (AI Verification)
        best_match = None
        best_distance = 1.0
        
        for student in students:
            is_match, distance = face_service.verify_face_encoding(
                student.user.face_encoding,
                face_encoding
            )
            
            if is_match and distance < best_distance:
                best_match = student
                best_distance = distance
        
        if not best_match:
            return None
        
        # Generate access token
        token = create_access_token(data={
            "user_id": best_match.user_id,
            "role": "student"
        })
        
        return {
            "user_id": best_match.user_id,
            "student_id": best_match.id,
            "username": best_match.user.username,
            "roll_number": best_match.roll_number,
            "name": f"{best_match.first_name} {best_match.last_name}",
            "role": "student",
            "token": token,
            "confidence": 1.0 - best_distance  # Convert distance to confidence
        }
    
    @staticmethod
    def authenticate_admin_with_face(db: Session, username: str, password: str, image_data: bytes) -> Optional[Dict]:
        """
        Authenticate admin with username, password, and face recognition.
        Extra security layer for admin.
        
        Args:
            db: Database session
            username: Admin username
            password: Admin password
            image_data: Face image for verification
        
        Returns:
            Dict with admin info and token, or None if authentication fails
        """
        # First verify username and password
        user = db.query(User).filter(
            User.username == username,
            User.role == "admin",
            User.is_active == True
        ).first()
        
        if not user or not verify_password(password, user.password_hash):
            return None
        
        # If admin has face registered, verify it
        if user.face_encoding:
            is_match, distance = face_service.verify_face(user.face_encoding, image_data)
            
            if not is_match:
                return None
        
        # Generate token
        token = create_access_token(data={"user_id": user.id, "role": "admin"})
        
        return {
            "user_id": user.id,
            "username": user.username,
            "role": "admin",
            "token": token
        }
    
    @staticmethod
    def register_student_face(db: Session, student_id: int, image_data: bytes) -> tuple[bool, str]:
        """
        Register face for a student (first-time face capture).
        
        Args:
            db: Database session
            student_id: Student ID
            image_data: Face image bytes
        
        Returns:
            tuple[bool, str]: (Success, Message/Error)
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        
        if not student:
            return False, "Student not found"
        
        # Generate face encoding (AI Processing)
        face_encoding = face_service.encode_face_from_image(image_data)
        
        if not face_encoding:
            return False, "Failed to encode face. Ensure face is clearly visible."
        
        # Get all students with registered faces to check for duplicates
        students = db.query(Student).join(User).filter(
            User.role == "student",
            Student.face_registered == True,
            User.face_encoding.isnot(None)
        ).all()
        
        # Try to match face with each existing student
        for existing_student in students:
            # Skip checking against self (should not be registered anyway)
            if existing_student.id == student_id:
                continue
                
            is_match, _ = face_service.verify_face_encoding(
                existing_student.user.face_encoding,
                face_encoding
            )
            
            if is_match:
                # Duplicate face found!
                dept_name = "Unknown Dept"
                class_name = "Unknown Class"
                div_name = "Unknown Division"
                
                if existing_student.division:
                    div_name = existing_student.division.name
                    if existing_student.division.class_:
                        class_name = existing_student.division.class_.name
                        if existing_student.division.class_.department:
                            dept_name = existing_student.division.class_.department.name
                            
                error_msg = f"Face already registered to Dept: {dept_name}, Class: {class_name}, Div: {div_name}, Student: {existing_student.first_name} {existing_student.last_name} (Roll No: {existing_student.roll_number})"
                return False, error_msg
        
        # Store encoding in database (as JSON string)
        import json
        student.user.face_encoding = json.dumps(face_encoding)
        student.face_registered = True
        
        # Save to file system as backup
        face_service.save_face_encoding(student.user_id, face_encoding)
        
        db.commit()
        
        return True, "Face registered successfully"

    @staticmethod
    def check_face_uniqueness(db: Session, image_data: bytes) -> tuple[bool, str]:
        """
        Check if a face is already registered to any student.
        
        Args:
            db: Database session
            image_data: Face image bytes
        
        Returns:
            tuple[bool, str]: (IsUnique, Message)
        """
        # Generate face encoding (AI Processing)
        face_encoding = face_service.encode_face_from_image(image_data)
        
        if not face_encoding:
            return False, "Failed to encode face. Ensure face is clearly visible."
        
        # Get all students with registered faces to check for duplicates
        students = db.query(Student).join(User).filter(
            User.role == "student",
            Student.face_registered == True,
            User.face_encoding.isnot(None)
        ).all()
        
        # Try to match face with each existing student
        for existing_student in students:
            is_match, _ = face_service.verify_face_encoding(
                existing_student.user.face_encoding,
                face_encoding
            )
            
            if is_match:
                # Duplicate face found!
                dept_name = "Unknown Dept"
                class_name = "Unknown Class"
                div_name = "Unknown Division"
                
                if existing_student.division:
                    div_name = existing_student.division.name
                    if existing_student.division.class_:
                        class_name = existing_student.division.class_.name
                        if existing_student.division.class_.department:
                            dept_name = existing_student.division.class_.department.name
                            
                error_msg = f"Face already registered to Dept: {dept_name}, Class: {class_name}, Div: {div_name}, Student: {existing_student.first_name} {existing_student.last_name} (Roll No: {existing_student.roll_number})"
                return False, error_msg
                
        return True, "Face is unique and can be registered"
