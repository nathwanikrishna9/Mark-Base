"""
AI-powered Face Recognition Module (AI FEATURE)
Handles face encoding, storage, and verification for students and admin.

This is the core AI component of the Markbase system.
"""

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("[WARN] face_recognition library not available. Face recognition features disabled.")

import numpy as np
import cv2
import json
import os
from typing import Optional, List, Tuple
from PIL import Image
import io
from app.core.config import settings


class FaceRecognitionService:
    """
    AI-powered face recognition service.
    
    Key Features (AI):
    - Face detection from images/webcam
    - Face encoding generation (128-dimensional vector)
    - Face matching and verification
    - Multiple face detection handling
    
    Used for:
    - Student login authentication
    - Student attendance marking
    - Admin extra security layer
    """
    
    def __init__(self):
        """Initialize face recognition service."""
        self.tolerance = settings.FACE_TOLERANCE
        self.encoding_path = settings.FACE_ENCODING_PATH
        
        # Create encoding directory if not exists
        os.makedirs(self.encoding_path, exist_ok=True)
    
    def encode_face_from_image(self, image_data: bytes) -> Optional[List[float]]:
        """
        Generate face encoding from image data (AI Processing).
        
        Args:
            image_data: Image file bytes (JPEG, PNG, etc.)
        
        Returns:
            List[float]: 128-dimensional face encoding vector or None if no face detected
        """
        if not FACE_RECOGNITION_AVAILABLE:
            print("[WARN] Face recognition not available - feature disabled")
            return None
        
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_data))
            image_np = np.array(image)
            
            # Convert RGB if needed
            if len(image_np.shape) == 2:  # Grayscale
                image_np = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
            elif image_np.shape[2] == 4:  # RGBA
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)
            
            # Detect faces in the image (AI - Face Detection)
            face_locations = face_recognition.face_locations(image_np)
            
            if len(face_locations) == 0:
                print("[ERROR] No face detected in image")
                return None
            
            if len(face_locations) > 1:
                print("[WARN] Multiple faces detected, using first face")
            
            # Generate face encoding (AI - Face Encoding)
            face_encodings = face_recognition.face_encodings(image_np, face_locations)
            
            if len(face_encodings) > 0:
                # Convert numpy array to list for JSON serialization
                encoding = face_encodings[0].tolist()
                print(f"[OK] Face encoding generated successfully (128-d vector)")
                return encoding
            
            return None
        
        except Exception as e:
            print(f"[ERROR] Error encoding face: {str(e)}")
            return None
    
    def verify_face_encoding(self, face_encoding_json: str, target_encoding: List[float]) -> Tuple[bool, float]:
        """
        Verify if target face encoding matches the stored encoding (AI Verification).
        
        Args:
            face_encoding_json: Stored face encoding as JSON string
            target_encoding: 128-dimensional face encoding vector
        
        Returns:
            Tuple[bool, float]: (is_match, confidence_distance)
        """
        try:
            # Load stored encoding
            stored_encoding = np.array(json.loads(face_encoding_json))
            target_encoding_np = np.array(target_encoding)
            
            # Compare faces (AI - Face Matching)
            face_distance = face_recognition.face_distance([stored_encoding], target_encoding_np)[0]
            
            # Check if distance is within tolerance
            is_match = float(face_distance) <= self.tolerance
            
            print(f"Face verification: Match={is_match}, Distance={face_distance:.3f}, Tolerance={self.tolerance}")
            
            return is_match, float(face_distance)
        
        except Exception as e:
            print(f"[ERROR] Error verifying face encoding: {str(e)}")
            return False, 1.0

    def verify_face(self, face_encoding_json: str, image_data: bytes) -> Tuple[bool, float]:
        """
        Verify if the face in the image matches the stored encoding (AI Verification).
        
        Args:
            face_encoding_json: Stored face encoding as JSON string
            image_data: Image file bytes to verify
        
        Returns:
            Tuple[bool, float]: (is_match, confidence_distance)
                - is_match: True if faces match within tolerance
                - confidence_distance: Lower is better (0.0 = perfect match)
        """
        try:
            # Generate encoding from provided image
            new_encoding = self.encode_face_from_image(image_data)
            
            if new_encoding is None:
                return False, 1.0
            
            return self.verify_face_encoding(face_encoding_json, new_encoding)
        
        except Exception as e:
            print(f"[ERROR] Error verifying face: {str(e)}")
            return False, 1.0
    
    def detect_faces_in_image(self, image_data: bytes) -> int:
        """
        Detect number of faces in an image.
        
        Args:
            image_data: Image file bytes
        
        Returns:
            int: Number of faces detected
        """
        if not FACE_RECOGNITION_AVAILABLE:
            return 0
        
        try:
            image = Image.open(io.BytesIO(image_data))
            image_np = np.array(image)
            
            # Convert to RGB if needed
            if len(image_np.shape) == 2:
                image_np = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
            elif image_np.shape[2] == 4:
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)
            
            # Detect faces
            face_locations = face_recognition.face_locations(image_np)
            
            return len(face_locations)
        
        except Exception as e:
            print(f"[ERROR] Error detecting faces: {str(e)}")
            return 0
    
    def save_face_encoding(self, user_id: int, encoding: List[float]) -> bool:
        """
        Save face encoding to file system (backup storage).
        
        Args:
            user_id: User ID
            encoding: Face encoding vector
        
        Returns:
            bool: True if saved successfully
        """
        try:
            file_path = os.path.join(self.encoding_path, f"user_{user_id}.json")
            
            with open(file_path, 'w') as f:
                json.dump({"user_id": user_id, "encoding": encoding}, f)
            
            print(f"[OK] Face encoding saved for user {user_id}")
            return True
        
        except Exception as e:
            print(f"[ERROR] Error saving face encoding: {str(e)}")
            return False
    
    def load_face_encoding(self, user_id: int) -> Optional[List[float]]:
        """
        Load face encoding from file system.
        
        Args:
            user_id: User ID
        
        Returns:
            List[float]: Face encoding or None if not found
        """
        try:
            file_path = os.path.join(self.encoding_path, f"user_{user_id}.json")
            
            if not os.path.exists(file_path):
                return None
            
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            return data.get("encoding")
        
        except Exception as e:
            print(f"[ERROR] Error loading face encoding: {str(e)}")
            return None


# Global face recognition service instance
face_service = FaceRecognitionService()
