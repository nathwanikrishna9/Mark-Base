"""
Entry point to run the Markbase backend server.
"""

import uvicorn
import os
from app.core.config import settings

if __name__ == "__main__":
    port = int(os.environ.get("PORT", settings.PORT))  # Railway port

    print("=" * 60)
    print("  MARKBASE - Attendance Management System")
    print(f"  Version: {settings.APP_VERSION}")
    print("=" * 60)
    print(f"\n🚀 Starting server on http://{settings.HOST}:{port}")
    print(f"📚 API Documentation: http://{settings.HOST}:{port}/docs")
    print(f"🔧 Debug Mode: {settings.DEBUG}\n")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",   # IMPORTANT for Railway
        port=port,
        reload=settings.DEBUG,
        log_level="info"
    )