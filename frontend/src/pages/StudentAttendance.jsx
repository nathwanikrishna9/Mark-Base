import React, { useState, useEffect, useRef } from 'react'

  

const StudentAttendance = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    fetchOpenSessions()
  }, [])

  const fetchOpenSessions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/attendance/sessions/open')
      const data = await response.json()
      setSessions(data)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load sessions' })
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCamera(true)
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to access camera' })
    }
  }

  const captureImage = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg')
  }

  const markAttendance = async () => {
    try {
      const imageData = captureImage()
      const blob = await (await fetch(imageData)).blob()
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' })
      
      const formData = new FormData()
      formData.append('attendance_session_id', selectedSession.attendance_session_id)
      formData.append('student_id', user.student_id)
      formData.append('image', file)
      
      const response = await fetch(
        "http://localhost:8000/api/attendance/mark/",
        {
          method: 'POST',
          body: formData
        }
      )

      if (!response.ok) {
        throw new Error('Failed to mark attendance')
      }

      const result = await response.json()
      setMessage({ 
        type: 'success', 
        text: 'Attendance marked successfully! Status: ' + result.status
      })
      setShowCamera(false)
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.message || 'Failed to mark attendance. Please try again.' 
      })
    }
  }

  return (
    <div className="student-attendance">
      <h1>Mark Your Attendance</h1>
      
      {message.text && (
        <div className={'message message-' + message.type}>
          {message.text}
        </div>
      )}

      <div className="sessions-list">
        <h2>Available Sessions</h2>
        {sessions.length === 0 ? (
          <p>No open sessions available</p>
        ) : (
          sessions.map(session => (
            <div 
              key={session.attendance_session_id}
              className={'session-item ' + (selectedSession?.attendance_session_id === session.attendance_session_id ? 'selected' : '')}
              onClick={() => setSelectedSession(session)}
            >
              <h3>{session.subject_name}</h3>
              <p>Course: {session.course_name}</p>
              <p>Semester: {session.semester}</p>
              <p>Section: {session.section}</p>
            </div>
          ))
        )}
      </div>

      {selectedSession && !showCamera && (
        <button onClick={startCamera} className="btn-primary">
          Start Camera to Mark Attendance
        </button>
      )}

      {showCamera && (
        <div className="camera-section">
          <video ref={videoRef} autoPlay />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <button onClick={markAttendance} className="btn-primary">
            Capture & Mark Attendance
          </button>
        </div>
      )}
    </div>
  )
}

export default StudentAttendance