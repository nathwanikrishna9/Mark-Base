"""
First-Time Setup Script for Day-Wise Attendance System

This script will:
1. Create the database with the new schema
2. Create sample data for testing
3. Verify everything is working

Run this ONLY on first setup or fresh installation.
"""

import sys
from pathlib import Path
from datetime import datetime, date, time

# Add app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import engine, Base, get_db
from app.models import (
    User, Department, Class, Division, Student,
    AttendanceDay, AttendanceRecord, LeaveRequest,
    GracePeriodConfig
)
from app.utils.security import get_password_hash


def create_database():
    """Create all tables in the database."""
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


def create_sample_data():
    """Create sample data for testing."""
    print("\n👥 Creating sample data...")
    
    db = next(get_db())
    
    try:
        # 1. Create Department
        dept = Department(
            name="Computer Engineering",
            code="COMP"
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        print(f"✅ Created department: {dept.name}")
        
        # 2. Create Class
        cls = Class(
            name="Third Year",
            department_id=dept.id
        )
        db.add(cls)
        db.commit()
        db.refresh(cls)
        print(f"✅ Created class: {cls.name}")
        
        # 3. Create Division
        div = Division(
            name="A",
            class_id=cls.id
        )
        db.add(div)
        db.commit()
        db.refresh(div)
        print(f"✅ Created division: {div.name}")
        
        # 4. Create Grace Period Configuration
        grace_config = GracePeriodConfig(
            division_id=div.id,
            grace_start_time=time(9, 15),
            grace_end_time=time(9, 30),
            late_threshold_minutes=15,  # Late until 9:45
            is_active=True
        )
        db.add(grace_config)
        db.commit()
        print(f"✅ Created grace period: 9:15-9:30 AM")
        
        # 5. Create Admin User
        admin = User(
            username="admin",
            email="admin@markbase.com",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print(f"✅ Created admin user (username: admin, password: admin123)")
        
        # 6. Create Staff User
        staff = User(
            username="staff1",
            email="staff@markbase.com",
            full_name="John Doe",
            hashed_password=get_password_hash("staff123"),
            role="staff",
            is_active=True
        )
        db.add(staff)
        db.commit()
        print(f"✅ Created staff user (username: staff1, password: staff123)")
        
        # 7. Create Sample Students
        students_data = [
            {"roll_no": "TE-COMP-A-001", "name": "Alice Johnson", "email": "alice@student.com"},
            {"roll_no": "TE-COMP-A-002", "name": "Bob Smith", "email": "bob@student.com"},
            {"roll_no": "TE-COMP-A-003", "name": "Charlie Brown", "email": "charlie@student.com"},
            {"roll_no": "TE-COMP-A-004", "name": "Diana Prince", "email": "diana@student.com"},
            {"roll_no": "TE-COMP-A-005", "name": "Eve Wilson", "email": "eve@student.com"},
        ]
        
        students = []
        for student_data in students_data:
            student = Student(
                roll_no=student_data["roll_no"],
                name=student_data["name"],
                email=student_data["email"],
                division_id=div.id
            )
            students.append(student)
            db.add(student)
        
        db.commit()
        print(f"✅ Created {len(students)} sample students")
        
        # 8. Create an Attendance Day for today
        attendance_day = AttendanceDay(
            date=date.today(),
            division_id=div.id,
            created_by=staff.id
        )
        db.add(attendance_day)
        db.commit()
        db.refresh(attendance_day)
        print(f"✅ Created attendance day for {date.today()}")
        
        # 9. Mark sample attendance (some present, some late, some absent)
        current_time = datetime.now().time()
        
        # Student 1: Present (arrived at 9:20)
        record1 = AttendanceRecord(
            attendance_day_id=attendance_day.id,
            student_id=students[0].id,
            status="present",
            check_in_time=time(9, 20),
            marked_by=staff.id,
            method="face_recognition"
        )
        db.add(record1)
        
        # Student 2: Late (arrived at 9:35)
        record2 = AttendanceRecord(
            attendance_day_id=attendance_day.id,
            student_id=students[1].id,
            status="late",
            check_in_time=time(9, 35),
            marked_by=staff.id,
            method="manual"
        )
        db.add(record2)
        
        # Student 3: Leave (approved leave)
        leave_req = LeaveRequest(
            student_id=students[2].id,
            start_date=date.today(),
            end_date=date.today(),
            reason="Medical appointment",
            status="approved",
            approved_by=staff.id,
            approved_at=datetime.now()
        )
        db.add(leave_req)
        
        record3 = AttendanceRecord(
            attendance_day_id=attendance_day.id,
            student_id=students[2].id,
            status="leave",
            marked_by=staff.id,
            leave_request_id=None  # Will update after commit
        )
        db.add(record3)
        
        db.commit()
        
        # Update leave request ID
        db.refresh(leave_req)
        record3.leave_request_id = leave_req.id
        db.commit()
        
        print(f"✅ Created sample attendance records")
        
        print("\n" + "="*60)
        print("🎉 SETUP COMPLETE!")
        print("="*60)
        print("\n📊 Summary:")
        print(f"  • Department: {dept.name} ({dept.code})")
        print(f"  • Class: {cls.name}")
        print(f"  • Division: {div.name}")
        print(f"  • Grace Period: 9:15 AM - 9:30 AM")
        print(f"  • Students: {len(students)}")
        print(f"  • Admin: admin / admin123")
        print(f"  • Staff: staff1 / staff123")
        print("\n📝 Sample Attendance for Today:")
        print(f"  • Present: Alice Johnson (9:20 AM)")
        print(f"  • Late: Bob Smith (9:35 AM)")
        print(f"  • Leave: Charlie Brown")
        print(f"  • Unmarked: Diana Prince, Eve Wilson")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating sample data: {e}")
        raise
    finally:
        db.close()


def verify_setup():
    """Verify that everything is set up correctly."""
    print("\n🔍 Verifying setup...")
    
    db = next(get_db())
    
    try:
        dept_count = db.query(Department).count()
        class_count = db.query(Class).count()
        div_count = db.query(Division).count()
        student_count = db.query(Student).count()
        user_count = db.query(User).count()
        grace_count = db.query(GracePeriodConfig).count()
        attendance_day_count = db.query(AttendanceDay).count()
        attendance_record_count = db.query(AttendanceRecord).count()
        
        print(f"✅ Departments: {dept_count}")
        print(f"✅ Classes: {class_count}")
        print(f"✅ Divisions: {div_count}")
        print(f"✅ Students: {student_count}")
        print(f"✅ Users: {user_count}")
        print(f"✅ Grace Period Configs: {grace_count}")
        print(f"✅ Attendance Days: {attendance_day_count}")
        print(f"✅ Attendance Records: {attendance_record_count}")
        
        if all([dept_count, class_count, div_count, student_count, user_count]):
            print("\n✅ All systems operational!")
            return True
        else:
            print("\n⚠️ Some data is missing. Please check the setup.")
            return False
            
    finally:
        db.close()


if __name__ == "__main__":
    print("="*60)
    print("  MARKBASE - FIRST TIME SETUP")
    print("  Day-Wise Attendance System")
    print("="*60)
    print("\nThis will create a fresh database with sample data.")
    
    response = input("\n⚠️  Continue? This will create/overwrite the database (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        print("\n🚀 Starting setup...\n")
        
        # Step 1: Create database
        create_database()
        
        # Step 2: Create sample data
        create_sample_data()
        
        # Step 3: Verify setup
        if verify_setup():
            print("\n" + "="*60)
            print("✅ SETUP SUCCESSFUL!")
            print("="*60)
            print("\n📌 Next Steps:")
            print("  1. Start the server: python -m uvicorn admin_updated:app --reload --port 8000")
            print("  2. Open browser: http://localhost:8000/docs")
            print("  3. Test the API endpoints")
            print("\n💡 Or run: python example_usage.py")
        else:
            print("\n❌ Setup completed with warnings. Please review the output above.")
    else:
        print("\n❌ Setup cancelled.")
