import React, { useState, useRef } from 'react'
import { daywiseAttendanceAPI } from '../services/api'
import Webcam from "react-webcam"

const StudentAttendance = () => {
  const [showCamera, setShowCamera] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const webcamRef = useRef(null)

  const captureAndMark = async () => {
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        setMessage({ type: 'error', text: 'Could not capture image from webcam array.' });
        return;
      }

      // Convert base64 to blob/file
      const blob = await fetch(imageSrc).then(r => r.blob());
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

      // In a student-self-facing flow, 'student_self' could be the marker. 
      // The backend uses marked_by ID. Assuming empty or user ID logic here.
      const result = await daywiseAttendanceAPI.markAttendanceWithFace('student_self', file)

      setMessage({
        type: 'success',
        text: `Attendance marked successfully for ${result.student_name}! Status: ${result.status}`
      })
      setShowCamera(false)
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to mark attendance. Please try again.'
      })
    }
  }

  return (
    <div className="student-attendance">
      <h1>Mark Your Daily Attendance</h1>
      
      {message.text && (
        <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'}`} style={{marginBottom: "20px"}}>
          {message.text}
        </div>
      )}

      {!showCamera ? (
        <button onClick={() => setShowCamera(true)} className="btn btn-primary" style={{padding: "15px 30px", fontSize: "16px"}}>
          Start Camera & Mark Attendance
        </button>
      ) : (
        <div className="camera-section" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'}}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={400}
            height={300}
            style={{ borderRadius: "8px", border: "2px solid #ccc" }}
          />
          <div style={{display: 'flex', gap: '10px'}}>
            <button onClick={captureAndMark} className="btn btn-success">
              Capture & Mark Present
            </button>
            <button onClick={() => setShowCamera(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentAttendance