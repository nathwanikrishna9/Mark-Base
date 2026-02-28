/**
 * Staff Dashboard - Day-wise Attendance Management
 * Features:
 * - Turn On/Off attendance for assigned division
 * - Mark attendance with face recognition
 * - Manual attendance marking
 * - View real-time attendance statistics
 * - Grace period: 9:15 AM - 9:30 AM
 */

import React, { useState, useEffect, useRef } from 'react'
import Webcam from 'react-webcam'
import { staffAPI, daywiseAttendanceAPI } from '../services/api'
import '../styles/dashboard.css'

function StaffDashboard({ user, onLogout }) {
  const [division, setDivision] = useState(null)
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [isAttendanceActive, setIsAttendanceActive] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, unmarked: 0 })
  const webcamRef = useRef(null)

  useEffect(() => {
    loadStaffDivision()
  }, [])

  useEffect(() => {
    if (division) {
      loadStudents()
      loadTodayAttendance()
    }
  }, [division, selectedDate])

  const loadStaffDivision = async () => {
    try {
      // Get staff details to find their assigned class/division
      const staffData = await staffAPI.getStaffById(user.staff_id)
      if (staffData.division_id) {
        setDivision({
          id: staffData.division_id,
          name: staffData.division_name,
          class_name: staffData.class_name
        })
      } else {
        setMessage({ type: 'error', text: 'You are not assigned to any class/division' })
      }
    } catch (err) {
      console.error('Failed to load staff division:', err)
      setMessage({ type: 'error', text: 'Failed to load your assigned division' })
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    try {
      const data = await staffAPI.getStudentsByDivision(division.id)
      setStudents(data)
    } catch (err) {
      console.error('Failed to load students:', err)
    }
  }

  const loadTodayAttendance = async () => {
    try {
      const data = await daywiseAttendanceAPI.getDivisionAttendance(division.id, selectedDate)
      setAttendanceRecords(data.records || [])
      calculateStats(data.records || [])
    } catch (err) {
      console.error('Failed to load attendance:', err)
      setAttendanceRecords([])
      calculateStats([])
    }
  }

  const calculateStats = (records) => {
    const stats = {
      present: records.filter(r => r.status === 'present').length,
      late: records.filter(r => r.status === 'late').length,
      absent: records.filter(r => r.status === 'absent').length,
      unmarked: records.filter(r => r.status === 'unmarked').length
    }
    setStats(stats)
  }

  const handleToggleAttendance = () => {
    setIsAttendanceActive(!isAttendanceActive)
    if (!isAttendanceActive) {
      setMessage({ type: 'success', text: 'Attendance is now active. Students can mark their attendance.' })
      setShowCamera(true)
    } else {
      setMessage({ type: 'info', text: 'Attendance has been turned off.' })
      setShowCamera(false)
    }
  }

  const handleMarkAttendanceWithFace = async () => {
    if (!webcamRef.current) return

    try {
      const imageSrc = webcamRef.current.getScreenshot()
      const blob = await fetch(imageSrc).then(r => r.blob())
      const file = new File([blob], 'attendance.jpg', { type: 'image/jpeg' })

      // Note: We need to implement face recognition endpoint that returns student_id
      // For now, we'll use a placeholder - you'll need to integrate actual face recognition
      const result = await daywiseAttendanceAPI.markAttendanceWithFace(user.staff_id, file)
      
      setMessage({ type: 'success', text: `Attendance marked for ${result.student_name}` })
      loadTodayAttendance()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to mark attendance' })
    }
  }

  const handleManualMark = async (studentId, status) => {
    try {
      const currentTime = new Date().toTimeString().split(' ')[0] // HH:MM:SS
      
      await daywiseAttendanceAPI.markAttendance({
        student_id: studentId,
        check_in_time: currentTime,
        marked_by: user.staff_id,
        method: 'manual'
      })
      
      setMessage({ type: 'success', text: 'Attendance marked successfully' })
      loadTodayAttendance()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to mark attendance' })
    }
  }

  const handleBulkMark = async (presentStudentIds) => {
    try {
      await daywiseAttendanceAPI.bulkMarkAttendance({
        division_id: division.id,
        date: selectedDate,
        marked_by: user.staff_id,
        present_student_ids: presentStudentIds
      })
      
      setMessage({ type: 'success', text: 'Bulk attendance marked successfully' })
      loadTodayAttendance()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to mark bulk attendance' })
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!division) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Staff Dashboard</h1>
          <button onClick={onLogout} className="btn btn-danger">Logout</button>
        </div>
        <div className="error-message">
          You are not assigned to any class/division. Please contact the administrator.
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Staff Dashboard</h1>
          <p className="welcome-text">Welcome, {user.name}</p>
          <p className="class-info">Class Teacher: {division.class_name} - {division.name}</p>
        </div>
        <button onClick={onLogout} className="btn btn-secondary">Logout</button>
      </div>

      <div className="dashboard-content">
        {message.text && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Attendance Control */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Attendance Control</h2>
            <div className="date-selector">
              <label>Date: </label>
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          {isToday && (
            <div className="attendance-toggle">
              <button
                onClick={handleToggleAttendance}
                className={`btn btn-lg ${isAttendanceActive ? 'btn-danger' : 'btn-success'}`}
              >
                {isAttendanceActive ? '🔴 Turn Off Attendance' : '🟢 Turn On Attendance'}
              </button>
              {isAttendanceActive && (
                <p className="attendance-status">
                  ✅ Attendance is active. Grace period: 9:15 AM - 9:30 AM
                </p>
              )}
            </div>
          )}

          {/* Statistics */}
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <h3>Total Students</h3>
              <p className="stat-number">{students.length}</p>
            </div>
            <div className="stat-card stat-present">
              <h3>Present</h3>
              <p className="stat-number">{stats.present}</p>
            </div>
            <div className="stat-card stat-late">
              <h3>Late</h3>
              <p className="stat-number">{stats.late}</p>
            </div>
            <div className="stat-card stat-absent">
              <h3>Absent</h3>
              <p className="stat-number">{stats.absent}</p>
            </div>
            <div className="stat-card stat-unmarked">
              <h3>Unmarked</h3>
              <p className="stat-number">{stats.unmarked}</p>
            </div>
          </div>
        </div>

        {/* Face Recognition Camera */}
        {isAttendanceActive && (
          <div className="dashboard-card">
            <h2>Face Recognition</h2>
            <div className="camera-section">
              <button
                onClick={() => setShowCamera(!showCamera)}
                className="btn btn-primary"
              >
                {showCamera ? '📷 Hide Camera' : '📷 Show Camera'}
              </button>

              {showCamera && (
                <div className="camera-container">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={640}
                    height={480}
                  />
                  <button 
                    onClick={handleMarkAttendanceWithFace} 
                    className="btn btn-success btn-lg"
                  >
                    📸 Capture & Mark Attendance
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Student List */}
        <div className="dashboard-card full-width">
          <h2>Student Attendance - {selectedDate}</h2>
          
          <div className="attendance-table">
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Status</th>
                  <th>Check-in Time</th>
                  {isToday && isAttendanceActive && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const record = attendanceRecords.find(r => r.student_id === student.id)
                  const status = record?.status || 'unmarked'
                  const checkInTime = record?.check_in_time || '-'

                  return (
                    <tr key={student.id}>
                      <td>{student.roll_number}</td>
                      <td>{student.first_name} {student.last_name}</td>
                      <td>
                        <span className={`badge badge-${status}`}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td>{checkInTime}</td>
                      {isToday && isAttendanceActive && (
                        <td>
                          {status === 'unmarked' && (
                            <button
                              onClick={() => handleManualMark(student.id)}
                              className="btn btn-sm btn-primary"
                            >
                              Mark Present
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffDashboard
