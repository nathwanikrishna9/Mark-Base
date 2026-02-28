from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, admin, staff, student, parent, attendance_daywise, timetable

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Day-wise Attendance Management System for Educational Institutions"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(staff.router)
app.include_router(student.router)
app.include_router(parent.router)

# Lecture-wise timetable system (used for staff session assignment)
app.include_router(timetable.router)

# Day-wise attendance system
app.include_router(attendance_daywise.router)

@app.on_event("startup")
async def startup_event():
    init_db()
    print("=" * 60)
    print("  MARKBASE - DAY-WISE ATTENDANCE SYSTEM")
    print("=" * 60)
    print("✅ Day-wise Attendance: ACTIVE")
    print("✅ Grace Period: 9:15-9:30 AM")
    print("✅ Auto Status: Present/Late/Absent")
    print("✅ Leave Management: ENABLED")
    print("=" * 60)
    print("📍 API Endpoints: /api/attendance/daywise/*")
    print("📚 Documentation: /docs")
    print("=" * 60)

@app.get("/")
def root():
    return {
        "status": "running", 
        "app": "Markbase Attendance System",
        "mode": "Day-wise Attendance Only",
        "features": [
            "Day-wise attendance (one per day)",
            "Grace period: 9:15-9:30 AM",
            "Auto status detection",
            "Leave management",
            "Bulk marking for divisions",
            "Face recognition support"
        ],
        "docs": "/docs"
    }
