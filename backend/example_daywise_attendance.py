"""
Example usage of the day-wise attendance system.
Demonstrates common operations.
"""

from datetime import date, time, datetime, timedelta
from app.core.database import SessionLocal, init_db
from app.models import (
    DailyAttendance, AttendanceConfig, Student, 
    Staff, Division, LeaveRequest
)


def example_1_mark_attendance():
    """Example 1: Mark attendance for a student."""
    print("\n" + "="*60)
    print("EXAMPLE 1: Mark Attendance")
    print("="*60)
    
    db = SessionLocal()
    
    # Get a student
    student = db.query(Student).first()
    if not student:
        print("❌ No students found. Please create students first.")
        db.close()
        return
    
    today = date.today()
    current_time = datetime.now().time()
    
    # Get attendance config to determine status
    config = db.query(AttendanceConfig).filter(
        AttendanceConfig.division_id == None
    ).first()
    
    # Determine status based on grace period
    grace_end = datetime.combine(today, config.grace_period_end)
    check_dt = datetime.combine(today, current_time)
    late_threshold = grace_end + timedelta(minutes=config.late_threshold_minutes)
    
    if check_dt <= grace_end:
        status = 'present'
    elif check_dt <= late_threshold:
        status = 'late'
    else:
        status = 'absent'
    
    # Check if already marked
    existing = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == student.id,
        DailyAttendance.date == today
    ).first()
    
    if existing:
        print(f"⚠️  Attendance already marked for {student.first_name} {student.last_name}")
        print(f"   Status: {existing.status}")
        print(f"   Check-in: {existing.check_in_time}")
    else:
        # Mark attendance
        attendance = DailyAttendance(
            student_id=student.id,
            division_id=student.division_id,
            date=today,
            check_in_time=current_time,
            status=status,
            marked_method='face_recognition',
            notes="Automatically marked via face recognition"
        )
        
        db.add(attendance)
        db.commit()
        
        print(f"✅ Attendance marked for {student.first_name} {student.last_name}")
        print(f"   Roll Number: {student.roll_number}")
        print(f"   Check-in Time: {current_time}")
        print(f"   Status: {status}")
    
    db.close()


def example_2_bulk_mark_division():
    """Example 2: Mark attendance for entire division."""
    print("\n" + "="*60)
    print("EXAMPLE 2: Bulk Mark Division Attendance")
    print("="*60)
    
    db = SessionLocal()
    
    # Get a division
    division = db.query(Division).first()
    if not division:
        print("❌ No divisions found.")
        db.close()
        return
    
    # Get all students in division
    students = db.query(Student).filter(
        Student.division_id == division.id
    ).all()
    
    if not students:
        print(f"❌ No students in division {division.name}")
        db.close()
        return
    
    today = date.today()
    current_time = time(9, 25)  # Example: marking at 9:25 AM (within grace period)
    
    marked_count = 0
    for student in students:
        # Check if already marked
        existing = db.query(DailyAttendance).filter(
            DailyAttendance.student_id == student.id,
            DailyAttendance.date == today
        ).first()
        
        if existing:
            continue
        
        # Mark as present (since 9:25 is within grace period)
        attendance = DailyAttendance(
            student_id=student.id,
            division_id=division.id,
            date=today,
            check_in_time=current_time,
            status='present',
            marked_method='manual'
        )
        
        db.add(attendance)
        marked_count += 1
    
    db.commit()
    
    print(f"✅ Bulk attendance marked for Division {division.name}")
    print(f"   Total Students: {len(students)}")
    print(f"   Marked: {marked_count}")
    print(f"   Already Marked: {len(students) - marked_count}")
    
    db.close()


def example_3_get_attendance_report():
    """Example 3: Generate attendance report for a student."""
    print("\n" + "="*60)
    print("EXAMPLE 3: Attendance Report")
    print("="*60)
    
    db = SessionLocal()
    
    # Get a student
    student = db.query(Student).first()
    if not student:
        print("❌ No students found.")
        db.close()
        return
    
    # Get attendance records for last 30 days
    start_date = date.today() - timedelta(days=30)
    end_date = date.today()
    
    records = db.query(DailyAttendance).filter(
        DailyAttendance.student_id == student.id,
        DailyAttendance.date >= start_date,
        DailyAttendance.date <= end_date
    ).order_by(DailyAttendance.date.desc()).all()
    
    # Calculate statistics
    total_days = len(records)
    present_days = sum(1 for r in records if r.status == 'present')
    late_days = sum(1 for r in records if r.status == 'late')
    absent_days = sum(1 for r in records if r.status == 'absent')
    
    attendance_percentage = (present_days / total_days * 100) if total_days > 0 else 0
    
    print(f"\n📊 ATTENDANCE REPORT")
    print(f"Student: {student.first_name} {student.last_name}")
    print(f"Roll Number: {student.roll_number}")
    print(f"Division: {student.division.name}")
    print(f"Period: {start_date} to {end_date}")
    print(f"\n{'='*40}")
    print(f"Total Days Recorded: {total_days}")
    print(f"Present: {present_days} ({present_days/total_days*100:.1f}%)" if total_days > 0 else "Present: 0")
    print(f"Late: {late_days} ({late_days/total_days*100:.1f}%)" if total_days > 0 else "Late: 0")
    print(f"Absent: {absent_days} ({absent_days/total_days*100:.1f}%)" if total_days > 0 else "Absent: 0")
    print(f"{'='*40}")
    print(f"Attendance Percentage: {attendance_percentage:.2f}%")
    
    if total_days > 0:
        print(f"\nRecent Records:")
        for record in records[:5]:  # Show last 5 records
            print(f"  {record.date}: {record.status.upper()} at {record.check_in_time}")
    
    db.close()


def example_4_create_leave_request():
    """Example 4: Create and approve leave request."""
    print("\n" + "="*60)
    print("EXAMPLE 4: Leave Request Management")
    print("="*60)
    
    db = SessionLocal()
    
    # Get a student
    student = db.query(Student).first()
    if not student:
        print("❌ No students found.")
        db.close()
        return
    
    # Create leave request
    leave_start = date.today() + timedelta(days=1)
    leave_end = date.today() + timedelta(days=3)
    
    leave_request = LeaveRequest(
        student_id=student.id,
        start_date=leave_start,
        end_date=leave_end,
        reason="Medical appointment",
        status='pending'
    )
    
    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)
    
    print(f"✅ Leave request created:")
    print(f"   Student: {student.first_name} {student.last_name}")
    print(f"   Period: {leave_start} to {leave_end}")
    print(f"   Reason: {leave_request.reason}")
    print(f"   Status: {leave_request.status}")
    
    # Approve leave request (example)
    staff = db.query(Staff).first()
    if staff:
        leave_request.status = 'approved'
        leave_request.approved_by = staff.id
        leave_request.approved_at = datetime.now()
        db.commit()
        
        print(f"\n✅ Leave request approved by staff ID: {staff.id}")
    
    db.close()


def example_5_edit_attendance():
    """Example 5: Edit existing attendance record."""
    print("\n" + "="*60)
    print("EXAMPLE 5: Edit Attendance Record")
    print("="*60)
    
    db = SessionLocal()
    
    # Get an attendance record
    attendance = db.query(DailyAttendance).first()
    if not attendance:
        print("❌ No attendance records found.")
        db.close()
        return
    
    print(f"Current Record:")
    print(f"  Student ID: {attendance.student_id}")
    print(f"  Date: {attendance.date}")
    print(f"  Original Status: {attendance.status}")
    
    # Edit status (e.g., mark late student as present after verification)
    old_status = attendance.status
    attendance.status = 'present'
    attendance.edited_by = 1  # Assuming staff ID 1
    attendance.edited_at = datetime.now()
    attendance.notes = "Status corrected by admin - verified early arrival"
    
    db.commit()
    
    print(f"\n✅ Attendance updated:")
    print(f"  Old Status: {old_status}")
    print(f"  New Status: {attendance.status}")
    print(f"  Edited At: {attendance.edited_at}")
    print(f"  Notes: {attendance.notes}")
    
    db.close()


def example_6_configure_grace_period():
    """Example 6: Update grace period configuration."""
    print("\n" + "="*60)
    print("EXAMPLE 6: Configure Grace Period")
    print("="*60)
    
    db = SessionLocal()
    
    # Get global config
    config = db.query(AttendanceConfig).filter(
        AttendanceConfig.division_id == None
    ).first()
    
    if not config:
        print("Creating new configuration...")
        config = AttendanceConfig(
            division_id=None,
            grace_period_start=time(9, 15),
            grace_period_end=time(9, 30),
            late_threshold_minutes=15
        )
        db.add(config)
    
    print(f"Current Configuration:")
    print(f"  Grace Period: {config.grace_period_start} - {config.grace_period_end}")
    print(f"  Late Threshold: {config.late_threshold_minutes} minutes")
    
    # Update configuration (example: change to 9:00-9:20)
    config.grace_period_start = time(9, 0)
    config.grace_period_end = time(9, 20)
    config.late_threshold_minutes = 20
    config.updated_at = datetime.now()
    
    db.commit()
    
    print(f"\n✅ Configuration updated:")
    print(f"  New Grace Period: {config.grace_period_start} - {config.grace_period_end}")
    print(f"  New Late Threshold: {config.late_threshold_minutes} minutes")
    
    db.close()


def main():
    """Run all examples."""
    print("=" * 60)
    print("DAY-WISE ATTENDANCE SYSTEM - USAGE EXAMPLES")
    print("=" * 60)
    
    # Initialize database
    print("\nInitializing database...")
    init_db()
    print("✅ Database ready")
    
    # Run examples
    examples = [
        example_1_mark_attendance,
        example_2_bulk_mark_division,
        example_3_get_attendance_report,
        example_4_create_leave_request,
        example_5_edit_attendance,
        example_6_configure_grace_period
    ]
    
    for example in examples:
        try:
            example()
        except Exception as e:
            print(f"\n❌ Example failed: {e}")
    
    print("\n" + "=" * 60)
    print("✅ All examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
