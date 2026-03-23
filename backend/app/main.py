from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, admin, staff, student, parent, attendance_daywise
from app.websocket_manager import manager
import os

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Day-wise Attendance Management System for Educational Institutions"
)

# Configure CORS - Allow Vercel frontend + localhost for development
# CORS_ORIGINS env var can override this (comma-separated list) — set this in Railway dashboard
_cors_env = os.environ.get("CORS_ORIGINS", "")
if _cors_env:
    allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    allow_origins = [
        "https://mark-base.vercel.app",
        "https://mark-base-nathwanikrishna9s-projects.vercel.app",  # Vercel team URL
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
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
    _seed_default_admin()
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


def _seed_default_admin():
    """
    Auto-create a default admin user when the database is empty.
    This ensures Railway deployments (which start with a fresh SQLite DB) 
    have at least one login account available immediately.
    Credentials can be customized via ADMIN_USERNAME / ADMIN_PASSWORD env vars.
    """
    from app.core.database import SessionLocal
    from app.models.user import User
    from app.utils.security import get_password_hash

    admin_username = os.environ.get("ADMIN_USERNAME", "admin")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == admin_username).first()
        if not existing:
            admin_user = User(
                username=admin_username,
                password_hash=get_password_hash(admin_password),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"[SEED] Default admin created: username='{admin_username}' password='{admin_password}'")
        else:
            print(f"[SEED] Admin user '{admin_username}' already exists, skipping.")
    except Exception as e:
        db.rollback()
        print(f"[SEED] Warning: Could not seed admin user: {e}")
    finally:
        db.close()


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
            "Face recognition support (when dlib is available)",
            "Real-time sync via WebSockets"
        ],
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Railway health check endpoint — returns 200 OK if the server is running."""
    return {"status": "ok", "app": "Markbase"}
