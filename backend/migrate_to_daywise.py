"""
Migration script to convert from lecture-based to day-wise attendance.
This script reads old attendance_sessions and attendance_records tables
and creates daily_attendance records.

WARNING: This will modify your database. Make a backup first!
"""

import sqlite3
from datetime import datetime, time
from pathlib import Path

# Database path
DB_PATH = "D:/FinalYearProject/Mark-Base/backend/markbase.db"


def backup_database():
    """Create a backup of the database before migration."""
    db_path = Path(DB_PATH)
    backup_path = db_path.parent / f"markbase_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    
    import shutil
    shutil.copy2(DB_PATH, backup_path)
    print(f"✅ Backup created at: {backup_path}")
    return backup_path


def migrate_attendance_data():
    """
    Migrate from lecture-based to day-wise attendance.
    
    Logic:
    - Group attendance_records by student_id and date
    - For each student-date combination, take the earliest check-in time
    - Determine status based on grace period (9:15-9:30)
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("📊 Starting migration...")
    
    # Check if old tables exist
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('attendance_sessions', 'attendance_records')
    """)
    old_tables = cursor.fetchall()
    
    if len(old_tables) < 2:
        print("⚠️  Old attendance tables not found. Nothing to migrate.")
        conn.close()
        return
    
    # Check if new table exists
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='daily_attendance'
    """)
    if not cursor.fetchone():
        print("❌ daily_attendance table not found. Please run schema first.")
        conn.close()
        return
    
    # Get all attendance records grouped by student and date
    cursor.execute("""
        SELECT 
            ar.student_id,
            s.division_id,
            ats.date,
            MIN(ar.marked_at) as earliest_checkin,
            ar.status,
            ar.marked_by
        FROM attendance_records ar
        JOIN attendance_sessions ats ON ar.attendance_session_id = ats.id
        JOIN students s ON ar.student_id = s.id
        WHERE ar.status IN ('present', 'late')
        GROUP BY ar.student_id, ats.date
        ORDER BY ats.date, ar.student_id
    """)
    
    old_records = cursor.fetchall()
    print(f"📋 Found {len(old_records)} attendance records to migrate")
    
    # Grace period configuration
    GRACE_PERIOD_END = time(9, 30)
    LATE_THRESHOLD = time(9, 45)
    
    migrated_count = 0
    skipped_count = 0
    
    for record in old_records:
        student_id, division_id, date_str, marked_at_str, old_status, marked_by = record
        
        # Parse the marked_at timestamp
        try:
            marked_at = datetime.fromisoformat(marked_at_str)
            check_in_time = marked_at.time()
        except:
            print(f"⚠️  Skipping record with invalid timestamp: {marked_at_str}")
            skipped_count += 1
            continue
        
        # Determine new status based on grace period
        if check_in_time <= GRACE_PERIOD_END:
            new_status = 'present'
        elif check_in_time <= LATE_THRESHOLD:
            new_status = 'late'
        else:
            new_status = 'absent'
        
        # Check if record already exists
        cursor.execute("""
            SELECT id FROM daily_attendance 
            WHERE student_id = ? AND date = ?
        """, (student_id, date_str))
        
        if cursor.fetchone():
            skipped_count += 1
            continue
        
        # Insert into daily_attendance
        cursor.execute("""
            INSERT INTO daily_attendance 
            (student_id, division_id, date, check_in_time, status, marked_by, marked_method, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            student_id,
            division_id,
            date_str,
            check_in_time.strftime('%H:%M:%S'),
            new_status,
            marked_by,
            'migrated',
            marked_at_str,
            datetime.now().isoformat()
        ))
        
        migrated_count += 1
    
    conn.commit()
    print(f"✅ Migration complete!")
    print(f"   - Migrated: {migrated_count} records")
    print(f"   - Skipped: {skipped_count} records")
    
    # Show summary
    cursor.execute("SELECT COUNT(*) FROM daily_attendance")
    total_new_records = cursor.fetchone()[0]
    print(f"   - Total records in daily_attendance: {total_new_records}")
    
    conn.close()


def create_default_config():
    """Create default attendance configuration."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if config exists
    cursor.execute("SELECT COUNT(*) FROM attendance_config")
    if cursor.fetchone()[0] > 0:
        print("⚠️  Attendance config already exists")
        conn.close()
        return
    
    # Insert default config
    cursor.execute("""
        INSERT INTO attendance_config 
        (division_id, grace_period_start, grace_period_end, late_threshold_minutes, 
         auto_absent_enabled, auto_absent_time, is_active, created_at, updated_at)
        VALUES (NULL, '09:15:00', '09:30:00', 15, 1, '23:59:59', 1, ?, ?)
    """, (datetime.now().isoformat(), datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    print("✅ Default attendance configuration created")


def drop_old_tables():
    """
    Drop old attendance tables after successful migration.
    WARNING: This is irreversible! Make sure backup is created first.
    """
    response = input("\n⚠️  WARNING: This will DROP old attendance tables. Continue? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Aborted. Old tables preserved.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS attendance_records")
    cursor.execute("DROP TABLE IF EXISTS attendance_sessions")
    cursor.execute("DROP TABLE IF EXISTS timetable_sessions")
    
    conn.commit()
    conn.close()
    print("✅ Old attendance tables dropped")


if __name__ == "__main__":
    print("=" * 60)
    print("ATTENDANCE MIGRATION TOOL")
    print("Lecture-based → Day-wise attendance")
    print("=" * 60)
    
    # Step 1: Backup
    print("\n[1/4] Creating backup...")
    backup_path = backup_database()
    
    # Step 2: Create default config
    print("\n[2/4] Creating default configuration...")
    create_default_config()
    
    # Step 3: Migrate data
    print("\n[3/4] Migrating attendance data...")
    migrate_attendance_data()
    
    # Step 4: Optional - Drop old tables
    print("\n[4/4] Clean up old tables (optional)...")
    drop_old_tables()
    
    print("\n" + "=" * 60)
    print("✅ MIGRATION COMPLETE!")
    print(f"   Backup saved at: {backup_path}")
    print("=" * 60)
