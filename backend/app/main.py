from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, admin, staff, student, parent, attendance_daywise
from app.websocket_manager import manager

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Day-wise Attendance Management System for Educational Institutions"
)

# Configure CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(staff.router)
app.include_router(student.router)
app.include_router(parent.router)

# Day-wise attendance system
app.include_router(attendance_daywise.router)

@app.on_event("startup")
async def startup_event():
    init_db()
    print("=" * 60)
    print("  MARKBASE - DAY-WISE ATTENDANCE SYSTEM")
    print("=" * 60)
    print("[OK] Day-wise Attendance: ACTIVE")
    print("[OK] Grace Period: 09:15-09:45 AM")
    print("[OK] Auto Status: Present/Late/Absent")
    print("[OK] Leave Management: ENABLED")
    print("[OK] WebSockets: ACTIVE")
    print("=" * 60)
    print("  API Endpoints: /api/attendance/daywise/*")
    print("  WebSocket Endpoints: /ws/attendance/{session_id}")
    print("  Documentation: /docs")
    print("=" * 60)

@app.websocket("/ws/attendance/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            # We can handle ping or generic messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@app.get("/")
def root():
    return {
        "status": "running", 
        "app": "Markbase Attendance System",
        "mode": "Day-wise Attendance Only",
        "features": [
            "Day-wise attendance (one per day)",
            "Grace period: 09:15-09:45 AM",
            "Auto status detection",
            "Leave management",
            "Bulk marking for divisions",
            "Face recognition support",
            "Real-time sync via WebSockets"
        ],
        "docs": "/docs"
    }
