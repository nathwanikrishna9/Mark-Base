"""
Seed script to populate database with sample data for testing.
Creates departments, classes, divisions, batches, subjects, users, and timetable.
"""

import sys
from datetime import time, date
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, init_db
from app.models import (
    User, Department, Class, Division, Batch, Subject,
    Staff, Student, Parent, TimetableSession
)
from app.utils.security import get_password_hash


def seed_database():
    """Populate database with sample data."""
    print("\n" + "=" * 60)
    print("  MARKBASE - Database Seeding")
    print("=" * 60 + "\n")
    
    # Initialize database
    init_db()
    db = SessionLocal()
    
    try:
        # 1. Create Admin User
        print("📝 Creating admin user...")
        admin_user = User(
            username="admin",
            password_hash=get_password_hash("admin123"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.flush()
        print("   ✓ Admin created (username: admin, password: admin123)")
        
        # 2. Create Department
        print("\n📝 Creating departments...")
        dept_comp = Department(name="Computer Engineering", code="COMP")
        dept_it = Department(name="Information Technology", code="IT")
        db.add_all([dept_comp, dept_it])
        db.flush()
        print("   ✓ Departments created")
        
        # 3. Create Classes (1k-6k for both departments)
        print("\n📝 Creating classes...")
        classes = []
        for dept in [dept_comp, dept_it]:
            for year in ["1k", "2k", "3k", "4k", "5k", "6k"]:
                cls = Class(name=year, department_id=dept.id)
                classes.append(cls)
                db.add(cls)
        db.flush()
        print(f"   ✓ {len(classes)} classes created (1k-6k for each department)")
        
        # 4. Create Divisions (A & B for each class)
        print("\n📝 Creating divisions...")
        divisions = []
        for cls in classes:
            for div_name in ["A", "B"]:
                div = Division(name=div_name, class_id=cls.id)
                divisions.append(div)
                db.add(div)
        db.flush()
        print(f"   ✓ {len(divisions)} divisions created (A & B for each class)")
        
        # Store references for seed data
        class_2k_comp = next(c for c in classes if c.name == "2k" and c.department_id == dept_comp.id)
        div_2k_a = next(d for d in divisions if d.name == "A" and d.class_id == class_2k_comp.id)
        div_2k_b = next(d for d in divisions if d.name == "B" and d.class_id == class_2k_comp.id)
        
        # 5. Create Batches (removed - theory only)
        print("\n📝 Skipping batches (theory sessions only)...")
        print("   ✓ Batches skipped")
        
        # 6. Create Subjects (for 2k class)
        print("\n📝 Creating subjects...")
        subjects_data = [
            ("Data Structures", "DSA", class_2k_comp.id),
            ("Database Management", "DBMS", class_2k_comp.id),
            ("Object Oriented Programming", "OOP", class_2k_comp.id),
            ("Computer Networks", "CN", class_2k_comp.id),
            ("Operating Systems", "OS", class_2k_comp.id),
        ]
        subjects = []
        for name, code, class_id in subjects_data:
            subject = Subject(name=name, code=code, class_id=class_id)
            subjects.append(subject)
            db.add(subject)
        db.flush()
        print(f"   ✓ {len(subjects)} subjects created for 2k class")
        
        # 7. Create Staff (assign to divisions as class teachers)
        print("\n📝 Creating staff members...")
        staff_data = [
            ("staff1", "staff123", "S001", "Rajesh", "Kumar", "rajesh@college.edu", dept_comp.id, div_2k_a.id),
            ("staff2", "staff123", "S002", "Priya", "Sharma", "priya@college.edu", dept_comp.id, div_2k_b.id),
            ("staff3", "staff123", "S003", "Amit", "Patel", "amit@college.edu", dept_comp.id, div_2k_a.id),
            ("staff4", "staff123", "S004", "Neha", "Singh", "neha@college.edu", dept_comp.id, div_2k_b.id),
            ("staff5", "staff123", "S005", "Vikram", "Mehta", "vikram@college.edu", dept_comp.id, div_2k_a.id),
        ]
        
        staff_objects = []
        for username, password, staff_id, first_name, last_name, email, dept_id, div_id in staff_data:
            user = User(
                username=username,
                password_hash=get_password_hash(password),
                role="staff",
                is_active=True
            )
            db.add(user)
            db.flush()
            
            staff = Staff(
                user_id=user.id,
                staff_id=staff_id,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone="9876543210",
                department_id=dept_id
            )
            staff_objects.append(staff)
            db.add(staff)
        
        db.flush()
        print(f"   ✓ {len(staff_objects)} staff members created")
        print("   ℹ️  Staff credentials: staff1/staff123, staff2/staff123, etc.")
        
        # 8. Create Students
        print("\n📝 Creating students...")
        students_data = [
            # Division A
            ("2023001", "Aarav", "Gupta", div_2k_a.id, None),
            ("2023002", "Vivaan", "Desai", div_2k_a.id, None),
            ("2023003", "Aditya", "Reddy", div_2k_a.id, None),
            ("2023004", "Vihaan", "Nair", div_2k_a.id, None),
            ("2023005", "Arjun", "Iyer", div_2k_a.id, None),
            ("2023006", "Sai", "Rao", div_2k_a.id, None),
            # Division B
            ("2023007", "Isha", "Verma", div_2k_b.id, None),
            ("2023008", "Ananya", "Joshi", div_2k_b.id, None),
            ("2023009", "Diya", "Mishra", div_2k_b.id, None),
            ("2023010", "Sara", "Khan", div_2k_b.id, None),
        ]
        
        student_objects = []
        for roll, first_name, last_name, div_id, batch_id in students_data:
            user = User(
                username=roll,
                password_hash=None,  # Face recognition only
                role="student",
                is_active=True
            )
            db.add(user)
            db.flush()
            
            student = Student(
                user_id=user.id,
                roll_number=roll,
                first_name=first_name,
                last_name=last_name,
                email=f"{roll}@student.college.edu",
                phone="9876543210",
                division_id=div_id,
                batch_id=batch_id,
                date_of_birth=date(2005, 1, 1),
                enrollment_year=2023,
                face_registered=False  # Need to register face on first login
            )
            student_objects.append(student)
            db.add(student)
        
        db.flush()
        print(f"   ✓ {len(student_objects)} students created")
        print("   ℹ️  Students use face recognition (need to register face on first login)")
        
        # 9. Create Parent Accounts
        print("\n📝 Creating parent accounts...")
        parent1_user = User(
            username="parent1",
            password_hash=get_password_hash("parent123"),
            role="parent",
            is_active=True
        )
        db.add(parent1_user)
        db.flush()
        
        parent1 = Parent(
            user_id=parent1_user.id,
            student_id=student_objects[0].id,  # Linked to first student
            first_name="Rajesh",
            last_name="Gupta",
            email="rajesh.gupta@parent.com",
            phone="9876543211",
            relation="father"
        )
        db.add(parent1)
        db.flush()
        print("   ✓ Parent account created (username: parent1, password: parent123)")
        print(f"   ℹ️  Linked to student: {student_objects[0].first_name} {student_objects[0].last_name}")
        
        # 10. Create Timetable Sessions
        print("\n📝 Creating timetable sessions...")
        
        # Division A - Monday
        timetable_data = [
            # Monday - Division A
            (div_2k_a.id, None, subjects[0].id, staff_objects[0].id, 0, time(9, 0), time(10, 0), "theory", "101"),
            (div_2k_a.id, None, subjects[1].id, staff_objects[1].id, 0, time(10, 0), time(11, 0), "theory", "101"),
            (div_2k_a.id, None, subjects[2].id, staff_objects[2].id, 0, time(11, 15), time(12, 15), "theory", "101"),
            (div_2k_a.id, None, subjects[0].id, staff_objects[0].id, 0, time(14, 0), time(17, 0), "lab", "Lab1"),
            
            # Tuesday - Division A
            (div_2k_a.id, None, subjects[3].id, staff_objects[3].id, 1, time(9, 0), time(10, 0), "theory", "101"),
            (div_2k_a.id, None, subjects[4].id, staff_objects[4].id, 1, time(10, 0), time(11, 0), "theory", "101"),
            (div_2k_a.id, None, subjects[1].id, staff_objects[1].id, 1, time(14, 0), time(17, 0), "lab", "Lab2"),
            
            # Monday - Division B
            (div_2k_b.id, None, subjects[0].id, staff_objects[0].id, 0, time(10, 0), time(11, 0), "theory", "102"),
            (div_2k_b.id, None, subjects[1].id, staff_objects[1].id, 0, time(11, 15), time(12, 15), "theory", "102"),
            (div_2k_b.id, None, subjects[0].id, staff_objects[0].id, 0, time(14, 0), time(17, 0), "lab", "Lab3"),
        ]
        
        for div_id, batch_id, subj_id, staff_id, day, start, end, stype, room in timetable_data:
            session = TimetableSession(
                division_id=div_id,
                batch_id=batch_id,
                subject_id=subj_id,
                staff_id=staff_id,
                day_of_week=day,
                start_time=start,
                end_time=end,
                session_type=stype,
                room_number=room,
                is_active=True
            )
            db.add(session)
        
        db.flush()
        print(f"   ✓ {len(timetable_data)} timetable sessions created")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "=" * 60)
        print("  ✅ DATABASE SEEDING COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print("\n📊 Summary:")
        print(f"   • Departments: 2")
        print(f"   • Classes: 2")
        print(f"   • Divisions: 2")
        print(f"   • Batches: 4")
        print(f"   • Subjects: {len(subjects)}")
        print(f"   • Staff: {len(staff_objects)}")
        print(f"   • Students: {len(student_objects)}")
        print(f"   • Parents: 1")
        print(f"   • Timetable Sessions: {len(timetable_data)}")
        
        print("\n🔑 Login Credentials:")
        print("   Admin:  username=admin, password=admin123")
        print("   Staff:  username=staff1, password=staff123")
        print("   Parent: username=parent1, password=parent123")
        print("   Student: Face Recognition (register on first login)")
        
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
