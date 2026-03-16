/**
 * Main App component with routing.
 * Handles navigation between different pages based on user role.
 */

import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import StaffDashboard from './pages/StaffDashboard'
import StudentDashboard from './pages/StudentDashboard'
import ParentDashboard from './pages/ParentDashboard'
import StudentAttendance from './pages/StudentAttendance'

function App() {
  const [user, setUser] = useState(null)
  console.log("Test1 for Deployment (method: fork)");
  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem('markbase_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('markbase_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('markbase_user')
  }

  return (
    <Router>
      <Routes>
        {/* Public student attendance page - no login required */}
        <Route 
          path="/student-attendance" 
          element={<StudentAttendance />} 
        />
        
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={`/${user.role}`} replace />} 
        />
        
        <Route 
          path="/admin/*" 
          element={user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
        />
        
        <Route 
          path="/staff/*" 
          element={user?.role === 'staff' ? <StaffDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
        />
        
        <Route 
          path="/student/*" 
          element={user?.role === 'student' ? <StudentDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
        />
        
        <Route 
          path="/parent/*" 
          element={user?.role === 'parent' ? <ParentDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
        />
        
        <Route 
          path="/" 
          element={<Navigate to={user ? `/${user.role}` : '/login'} replace />} 
        />
      </Routes>
    </Router>
  )
}

export default App
