import React, { useState, useEffect, useRef } from 'react'
import Webcam from 'react-webcam'
import api, { staffAPI, daywiseAttendanceAPI, adminAPI } from '../services/api'
import ThemeToggle from '../components/ThemeToggle'
import '../styles/dashboard.css'

function StaffDashboard({ user, onLogout }) {
  const [division, setDivision] = useState(null)
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [isAttendanceActive, setIsAttendanceActive] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, unmarked: 0 })
  const webcamRef = useRef(null)

  // For division selector
  const [showDivisionSelector, setShowDivisionSelector] = useState(false)
  const [allClasses, setAllClasses] = useState([])
  const [allDivisions, setAllDivisions] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedDivisionId, setSelectedDivisionId] = useState('')
  const [staffDepartmentId, setStaffDepartmentId] = useState(null)

  useEffect(() => {
    loadStaffDivision()
  }, [])

  useEffect(() => {
    if (division) {
      loadStudents()
      loadTodayAttendance()
      checkActiveSession()
    }
  }, [division, selectedDate])

  const checkActiveSession = async () => {
    if (selectedDate !== new Date().toISOString().split('T')[0]) {
      setIsAttendanceActive(false)
      setActiveSession(null)
      return
    }
    
    try {
      const session = await staffAPI.getActiveSession(user.staff_id)
      if (session && session.status === 'open' && session.division_id === division.id) {
        setActiveSession(session)
        setIsAttendanceActive(true)
      } else {
        setActiveSession(null)
        setIsAttendanceActive(false)
      }
    } catch (err) {
      console.error('Failed to check active session', err)
    }
  }

  // WebSocket setup for real-time updates
  useEffect(() => {
    let ws;
    if (isAttendanceActive && division) {
      const sessionId = `${division.id}_${selectedDate}`;
      ws = new WebSocket(`wss://mark-base-backend.railway.internal:8000/ws/attendance/${sessionId}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'ATTENDANCE_UPDATE') {
          setAttendanceRecords(prev => {
            const newRecords = [...prev];
            const index = newRecords.findIndex(r => r.student_id === data.student_id);
            if (index !== -1) {
              newRecords[index] = { ...newRecords[index], status: data.status, check_in_time: data.check_in_time, marked_method: data.marked_method };
              return newRecords;
            } else {
              loadTodayAttendance(); // fallback
              return prev;
            }
          });
        } else if (data.type === 'ATTENDANCE_BULK_UPDATE') {
          loadTodayAttendance();
        }
      };
      
      ws.onerror = (error) => console.error("WebSocket error:", error);
    }
    return () => {
      if (ws) ws.close();
    };
  }, [isAttendanceActive, division, selectedDate]);

  useEffect(() => {
    calculateStats(attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    if (showDivisionSelector) {
      loadAllClasses()
    }
  }, [showDivisionSelector])

  useEffect(() => {
    if (selectedClassId) {
      loadDivisionsForClass(selectedClassId)
    } else {
      setAllDivisions([])
      setSelectedDivisionId('')
    }
  }, [selectedClassId])

  const loadStaffDivision = async () => {
    try {
      const staffData = await staffAPI.getStaffById(user.staff_id)
      setStaffDepartmentId(staffData.department_id)
      if (staffData.division_id) {
        setDivision({
          id: staffData.division_id,
          name: staffData.division_name,
          class_name: staffData.class_name
        })
      } else {
        setShowDivisionSelector(true)
      }
    } catch (err) {
      console.error('Failed to load staff division:', err)
      setMessage({ type: 'error', text: 'Failed to load staff details. Please try again.' })
      setShowDivisionSelector(true)
    } finally {
      setLoading(false)
    }
  }

  const loadAllClasses = async () => {
    try {
      // Scope classes to staff's department
      let data
      if (staffDepartmentId) {
        const response = await api.get(`/api/admin/classes`, { params: { department_id: staffDepartmentId } })
        data = response.data
      } else {
        data = await adminAPI.getClasses()
      }
      setAllClasses(data)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load classes.' })
    }
  }

  const loadDivisionsForClass = async (classId) => {
    try {
      const data = await adminAPI.getDivisions(classId)
      setAllDivisions(data)
      setSelectedDivisionId('')
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load divisions.' })
    }
  }

  const handleDivisionSelect = () => {
    if (!selectedClassId || !selectedDivisionId) {
      setMessage({ type: 'error', text: 'Please select both a class and division.' })
      return
    }
    const cls = allClasses.find(c => c.id === parseInt(selectedClassId))
    const div = allDivisions.find(d => d.id === parseInt(selectedDivisionId))
    if (cls && div) {
      setDivision({
        id: div.id,
        name: div.name,
        class_name: cls.name
      })
      setShowDivisionSelector(false)
      setMessage({ type: '', text: '' })
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

  const handleTurnOnAttendance = async () => {
    try {
      const session = await staffAPI.openSession(division.id, user.staff_id)
      setActiveSession(session)
      setIsAttendanceActive(true)
      setShowCamera(true)
      setMessage({ type: 'success', text: 'Attendance session opened successfully. Students can now scan.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to open attendance session' })
    }
  }
  
  const handleTurnOffAttendance = async () => {
    if (!activeSession) return
    try {
      await staffAPI.closeSession(activeSession.id, user.staff_id)
      setActiveSession(null)
      setIsAttendanceActive(false)
      setShowCamera(false)
      setMessage({ type: 'info', text: 'Attendance session closed.' })
      loadTodayAttendance() // Refresh to show absent status for unmarked
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to close attendance session' })
    }
  }

  const handleMarkAttendanceWithFace = async () => {
    if (!webcamRef.current) return

    try {
      setIsCapturing(true)
      setMessage({ type: 'info', text: 'Verifying face... please wait.' })

      const imageSrc = webcamRef.current.getScreenshot()
      const blob = await fetch(imageSrc).then(r => r.blob())
      const file = new File([blob], 'attendance.jpg', { type: 'image/jpeg' })

      const result = await daywiseAttendanceAPI.markAttendanceWithFace(user.staff_id, file)
      
      setMessage({ type: 'success', text: `Attendance marked for ${result.student_name}. Status: ${result.status || 'recorded'}.` })
      loadTodayAttendance() // Immediately refresh the student list
      // View closes itself for 3 seconds, then resets to the 'Open Camera' button
      setTimeout(() => {
        setMessage({ type: '', text: '' })
        setIsCapturing(false)
        setShowCamera(false)
      }, 4000) // Give them 4 seconds to read the result
    } catch (err) {
      setMessage({ type: 'error', text: `${err.response?.data?.detail || 'Failed to mark attendance.'}` })
      setTimeout(() => {
        setMessage({ type: '', text: '' })
        setIsCapturing(false)
        setShowCamera(false)
      }, 4000)
    }
  }

  const handleManualMark = async (studentId) => {
    try {
      const currentTime = new Date().toTimeString().split(' ')[0]
      
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

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (showDivisionSelector) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Staff Dashboard</h1>
            <p className="welcome-text">Welcome, {user.name}</p>
          </div>
          <div className="dashboard-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <ThemeToggle />
            <button onClick={onLogout} className="btn btn-secondary">Logout</button>
          </div>
        </div>

        <div className="dashboard-content">
          {message.text && (
            <div className={`message message-${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="dashboard-card" style={{ maxWidth: '500px', margin: '40px auto' }}>
            <h2>Select Class &amp; Division</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Please select the class and division you want to manage attendance for.
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Class</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              >
                <option value="">-- Select Class --</option>
                {allClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Division</label>
              <select
                value={selectedDivisionId}
                onChange={e => setSelectedDivisionId(e.target.value)}
                disabled={!selectedClassId || allDivisions.length === 0}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              >
                <option value="">-- Select Division --</option>
                {allDivisions.map(div => (
                  <option key={div.id} value={div.id}>{div.name}</option>
                ))}
              </select>
            </div>

            <button onClick={handleDivisionSelect} className="btn btn-success" style={{ width: '100%', padding: '12px' }}>
              Proceed to Attendance
            </button>
          </div>
        </div>
      </div>
    )
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const isTodayDate = selectedDate === todayStr

  const now = new Date()
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes()
  const windowStart = 9 * 60 + 15      // 9:15 AM
  const windowEnd = 11 * 60 + 0      // 11:00 AM
  
  const isBeforeWindow = currentTotalMinutes < windowStart
  const isAfterWindow = currentTotalMinutes > windowEnd

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Staff Dashboard</h1>
          <p className="welcome-text">Welcome, {user.name}</p>
          <p className="class-info">Class: {division.class_name} - Division {division.name}</p>
        </div>
        <div className="dashboard-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <ThemeToggle />
          <button
            onClick={() => { setDivision(null); setShowDivisionSelector(true); setStudents([]); setAttendanceRecords([]); }}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
          >
            Change Division
          </button>
          <button onClick={onLogout} className="btn btn-secondary">Logout</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="alert alert-warning staff-session-note" style={{ padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)', fontWeight: '600', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
          Note: Session must be turned on by the staff exactly between 9:15 AM and 11:00 AM. The window closes at 11:00 AM.
        </div>

        {message.text && !isAttendanceActive && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {!isAttendanceActive ? (
           <div className="attendance-turn-on-section" style={{ textAlign: 'center', marginTop: '50px', padding: '0 10px' }}>
             <button 
                onClick={handleTurnOnAttendance} 
                disabled={isBeforeWindow || isAfterWindow}
                className={`btn btn-lg ${(!isBeforeWindow && !isAfterWindow) ? 'btn-success' : 'btn-secondary'}`} 
                style={{ 
                  padding: '16px 24px', 
                  fontSize: 'clamp(1rem, 4vw, 1.5rem)', 
                  width: '100%',
                  maxWidth: '400px',
                  cursor: (isBeforeWindow || isAfterWindow) ? 'not-allowed' : 'pointer',
                  opacity: (isBeforeWindow || isAfterWindow) ? 0.6 : 1
                }}
             >
                Turn On Attendance Session
             </button>

             {isBeforeWindow && (
                <p style={{ color: '#888', fontStyle: 'italic', fontSize: '18px', marginTop: '20px' }}>
                  Attendance window opens at 9:15 AM.
                </p>
             )}

             {isAfterWindow && (
                <p style={{ color: '#e53935', fontWeight: '600', fontSize: '18px', marginTop: '20px' }}>
                  Attendance window has closed. Wait for tomorrow at 9:15 AM.
                </p>
             )}
           </div>
        ) : (
          <>
            <div className="dashboard-card">
              <div className="card-header attendance-status-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <h2>Attendance Status</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={handleTurnOffAttendance} className="btn btn-lg btn-danger" style={{ flexShrink: 0 }}>
                    Turn Off Attendance
                  </button>
                  <p className="attendance-status" style={{ margin: 0, color: 'var(--success)', fontWeight: '700', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                    Session is active.
                    <br/>
                    <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)', fontWeight: '500' }}>
                      Present deadline: 10:15 | Late deadline: 11:00
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {isAttendanceActive && (
              <div className="dashboard-card" style={{ textAlign: 'center' }}>
                <h2>Face Recognition - Active</h2>
                
                {isCapturing ? (
                  <div style={{ margin: '40px 0', padding: '40px', background: 'var(--tertiary-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '22px', color: message.type === 'success' ? 'var(--success)' : message.type === 'error' ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {message.text}
                    </h3>
                  </div>
                ) : showCamera ? (
                  <div className="camera-section">
                    <div className="camera-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: '15px', width: '100%', maxWidth: '100%' }}>
                      <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', borderRadius: '8px' }}>
                        <Webcam
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          width={640}
                          height={480}
                          style={{ width: '100%', maxWidth: '100%', height: 'auto', borderRadius: '8px', border: '3px solid var(--border-color)' }}
                        />
                      </div>
                      <button onClick={handleMarkAttendanceWithFace} className="btn btn-success btn-lg" style={{ width: '100%', maxWidth: '400px', padding: '15px', fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
                        Capture Face and Mark Attendance
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '40px 20px', backgroundColor: 'var(--tertiary-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '20px', width: '100%' }}>
                    <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Ready for the next student to scan.</p>
                    <button 
                      onClick={() => setShowCamera(true)} 
                      className="btn btn-primary btn-lg"
                      style={{ padding: '16px 24px', fontSize: 'clamp(1rem, 3vw, 1.25rem)', width: '100%', maxWidth: '400px' }}
                    >
                      Turn On Camera to Scan Face
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="dashboard-card" style={{ marginTop: '20px' }}>
              <h2>Student Status</h2>
              <div className="stats-row" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ background: '#d4edda', padding: '10px 20px', borderRadius: '8px', color: '#155724' }}>
                  <strong>Present:</strong> {stats.present}
                </div>
                <div style={{ background: '#fff3cd', padding: '10px 20px', borderRadius: '8px', color: '#856404' }}>
                  <strong>Late:</strong> {stats.late}
                </div>
                <div style={{ background: '#f8d7da', padding: '10px 20px', borderRadius: '8px', color: '#721c24' }}>
                  <strong>Absent:</strong> {stats.absent}
                </div>
                <div style={{ background: '#e2e3e5', padding: '10px 20px', borderRadius: '8px', color: '#383d41' }}>
                  <strong>Unmarked:</strong> {stats.unmarked}
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      {!isAttendanceActive && <th>Photo</th>}
                      <th>Name</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map(record => (
                      <tr key={record.student_id}>
                        <td>{record.roll_number || '-'}</td>
                        {!isAttendanceActive && (
                          <td>
                            <img 
                              src={`http://mark-base-backend.railway.internal:8000/api/admin/students/${record.student_id}/photo`} 
                              alt={record.student_name || 'Student'}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          </td>
                        )}
                        <td>{record.student_name || 'Unknown'}</td>
                        <td>
                          <div className="status-buttons-wrap" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['present', 'late', 'absent'].map(statusOption => (
                              <button
                                key={statusOption}
                                onClick={async () => {
                                  try {
                                    await daywiseAttendanceAPI.overrideAttendance(division.id, record.student_id, selectedDate, { status: statusOption, updated_by: user.staff_id });
                                    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                                  } catch (err) {
                                  }
                                }}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  backgroundColor: (record.status === statusOption) ? (statusOption === 'present' ? 'var(--success)' : statusOption === 'late' ? 'var(--warning)' : 'var(--danger)') : 'var(--secondary-bg)',
                                  color: (record.status === statusOption) ? '#fff' : 'var(--text-primary)'
                                }}
                              >
                                {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>{record.check_in_time || '-'}</td>
                      </tr>
                    ))}
                    {attendanceRecords.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center' }}>No records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default StaffDashboard