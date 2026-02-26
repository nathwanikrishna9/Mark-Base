# ============================================
#   MARKBASE - DAY-WISE ATTENDANCE SYSTEM
#   COMPLETE SETUP GUIDE
# ============================================

## ✅ OPTION B COMPLETE: DAY-WISE ONLY MODE

Your system is now configured for DAY-WISE attendance ONLY.
Lecture-wise attendance has been disabled.

---

## 🚀 HOW TO START

### EASIEST WAY:
Double-click: D:\FinalYearProject\Mark-Base\START_ALL.bat

### MANUAL WAY:

**Terminal 1 - Backend:**
```powershell
cd D:\FinalYearProject\Mark-Base\backend
python run.py
```

**Terminal 2 - Frontend:**
```powershell
cd D:\FinalYearProject\Mark-Base\frontend
npm run dev
```

---

## 🌐 ACCESS YOUR APP

- **Frontend:** http://localhost:3000
- **Backend API Docs:** http://localhost:8000/docs
- **Backend:** http://localhost:8000

---

## 📅 DAY-WISE ATTENDANCE FEATURES

### For Students:
- Enter Student ID
- Scan face once per day
- Auto status based on time:
  - ✅ 9:15-9:30 AM = Present
  - ⚠️ 9:30-9:45 AM = Late
  - ❌ After 9:45 AM = Absent

### For Staff:
- Bulk mark entire division
- View attendance by date
- Approve/reject leave requests
- Daily attendance reports

---

## 📁 FILES MODIFIED

### Backend:
✅ app/main.py - Disabled lecture-wise, enabled day-wise only
✅ app/models/attendance.py - Day-wise models
✅ app/api/attendance_daywise.py - Day-wise API endpoints

### Frontend:
✅ src/pages/StudentAttendance.jsx - NEW (day-wise)
✅ src/pages/StaffDashboard.jsx - UPDATED (day-wise)
✅ src/services/api.js - Added daywiseAttendanceAPI

---

## 🎯 WHAT'S DISABLED

❌ Lecture-wise attendance sessions
❌ Timetable-based attendance
❌ Per-lecture marking

---

## 📊 API ENDPOINTS (Day-wise Only)

- POST /api/attendance/daywise/mark
- POST /api/attendance/daywise/mark-face/:studentId
- POST /api/attendance/daywise/bulk-mark
- GET /api/attendance/daywise/student/:studentId/:date
- GET /api/attendance/daywise/division/:divisionId/:date

Full API docs: http://localhost:8000/docs

---

## ⚙️ CONFIGURATION

**Grace Period:** 9:15-9:30 AM (can be changed via API)
**Late Threshold:** 9:30-9:45 AM
**Database:** SQLite (D:\FinalYearProject\Mark-Base\backend\markbase.db)

---

## 🔄 NEED TO GO BACK?

If you want to re-enable lecture-wise attendance:
1. Uncomment timetable import in app/main.py
2. Restore original frontend files from .backup files

---

## ✅ YOU'RE READY!

Just run:
```
python run.py     (in backend folder)
npm run dev       (in frontend folder)
```

Or double-click: START_ALL.bat

============================================
