"""
Migration Script: Migrate existing parent-student relationships to the new
parent_students association table for multi-child support.

This script:
1. Creates the parent_students table if it doesn't exist
2. Copies existing parent.student_id entries into the association table
3. Leaves the legacy student_id column intact for backward compatibility

Usage:
  cd backend
  python migrate_parent_students.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, SessionLocal, Base
from app.models import Parent, ParentStudent, Student
from sqlalchemy import inspect, text


def run_migration():
    print("=" * 60)
    print("  Parent Multi-Child Migration")
    print("=" * 60)
    
    # Step 1: Create tables if they don't exist
    print("\n[1/3] Ensuring parent_students table exists...")
    Base.metadata.create_all(bind=engine)
    
    # Verify table exists
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "parent_students" in tables:
        print("  ✓ parent_students table exists")
    else:
        print("  ✗ ERROR: parent_students table was not created!")
        return False
    
    # Step 2: Migrate existing data
    print("\n[2/3] Migrating existing parent-student relationships...")
    db = SessionLocal()
    
    try:
        parents = db.query(Parent).all()
        migrated = 0
        skipped = 0
        
        for parent in parents:
            if parent.student_id:
                # Check if link already exists
                existing = db.query(ParentStudent).filter(
                    ParentStudent.parent_id == parent.id,
                    ParentStudent.student_id == parent.student_id
                ).first()
                
                if existing:
                    skipped += 1
                    continue
                
                # Verify student exists
                student = db.query(Student).filter(Student.id == parent.student_id).first()
                if not student:
                    print(f"  ⚠ Skipping parent {parent.id}: student {parent.student_id} not found")
                    skipped += 1
                    continue
                
                # Create association record
                link = ParentStudent(
                    parent_id=parent.id,
                    student_id=parent.student_id
                )
                db.add(link)
                migrated += 1
        
        db.commit()
        print(f"  ✓ Migrated: {migrated} | Skipped: {skipped} | Total parents: {len(parents)}")
        
    except Exception as e:
        db.rollback()
        print(f"  ✗ ERROR during migration: {e}")
        return False
    finally:
        db.close()
    
    # Step 3: Verify
    print("\n[3/3] Verification...")
    db = SessionLocal()
    try:
        total_links = db.query(ParentStudent).count()
        total_parents = db.query(Parent).count()
        print(f"  Total parent accounts: {total_parents}")
        print(f"  Total parent-student links: {total_links}")
    finally:
        db.close()
    
    print("\n" + "=" * 60)
    print("  Migration Complete! ✓")
    print("=" * 60)
    print("\nParents can now have multiple children linked to their account.")
    print("Existing single-child relationships have been preserved.\n")
    
    return True


if __name__ == "__main__":
    run_migration()
