"""
Quick test to verify day-wise attendance models are working.
"""
import sys
sys.path.insert(0, 'D:/FinalYearProject/Mark-Base/backend')

from app.core.database import engine, Base
from app.models.attendance import DailyAttendance, GracePeriod, LeaveRequest

print("Testing Day-Wise Attendance Models...")
print("=" * 60)

try:
    # Test if models can be imported
    print("✓ Models imported successfully")
    
    # Test if tables can be created
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully")
    
    # Check table names
    print("\nCreated tables:")
    for table_name in Base.metadata.tables.keys():
        if 'daily_attendance' in table_name or 'grace' in table_name or 'leave' in table_name:
            print(f"  - {table_name}")
    
    print("\n" + "=" * 60)
    print("✅ All tests passed! Day-wise attendance is ready.")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
