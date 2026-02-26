# 🚀 Mark-Base - Quick Start Commands

## Easy Start (Recommended)
Double-click: `START_PROJECT.bat`
This will open both backend and frontend servers in separate windows.

---

## Manual Start Commands

### Option 1: Using Batch Files (Windows)

**Backend:**
Double-click: `start_backend.bat`
OR in terminal:
```cmd
start_backend.bat
```

**Frontend:**
Double-click: `start_frontend.bat`
OR in terminal:
```cmd
start_frontend.bat
```

---

### Option 2: Using Command Prompt

**Terminal 1 - Backend:**
```cmd
cd D:\FinalYearProject\Mark-Base\backend
venv\Scripts\activate.bat
python run.py
```

**Terminal 2 - Frontend:**
```cmd
cd D:\FinalYearProject\Mark-Base\frontend
npm run dev
```

---

### Option 3: Using PowerShell

**Terminal 1 - Backend:**
```powershell
cd D:\FinalYearProject\Mark-Base\backend
.\venv\Scripts\Activate.ps1
python run.py
```

**Terminal 2 - Frontend:**
```powershell
cd D:\FinalYearProject\Mark-Base\frontend
npm run dev
```

---

## 🌐 Access Your Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🛑 Stop Servers

Press `Ctrl + C` in each terminal window.

---

## ✅ What's Configured

- ✅ Virtual environment with all Python dependencies
- ✅ Node modules with all React dependencies  
- ✅ Database initialized (markbase.db)
- ✅ Environment variables configured (.env)
- ✅ Required folders created (face_encodings, uploads)

---

## 📝 Optional: Add Sample Data

```cmd
cd D:\FinalYearProject\Mark-Base\backend
venv\Scripts\activate.bat
python seed_data.py
```

---

Setup completed on: 2026-02-14
