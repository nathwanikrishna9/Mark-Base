/**
 * Unified Login Page for all user roles.
 * Supports password-based and face recognition authentication.
 */

import React, { useState, useRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Webcam from 'react-webcam'
import { authAPI } from '../services/api'
import '../styles/login.css'

function Login({ onLogin }) {
  const [loginMode, setLoginMode] = useState('password') // 'password' or 'face'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const webcamRef = useRef(null)

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userData = await authAPI.login(username, password)
      onLogin(userData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleFaceLogin = async () => {
    setLoading(true)
    setError('')

    try {
      // Capture image from webcam
      const imageSrc = webcamRef.current.getScreenshot()
      
      if (!imageSrc) {
        setError('Failed to capture image. Please try again.')
        setLoading(false)
        return
      }

      // Convert base64 to blob
      const blob = await fetch(imageSrc).then(r => r.blob())
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' })

      // Authenticate with face
      const userData = await authAPI.loginWithFace(file)
      onLogin(userData)
    } catch (err) {
      setError(err.response?.data?.detail || 'Face not recognized. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>MARKBASE</h1>
          <p>AI-Powered Attendance Management System</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <div className="login-tabs">
          <button
            className={`tab ${loginMode === 'password' ? 'active' : ''}`}
            onClick={() => {
              setLoginMode('password')
              setShowCamera(false)
              setError('')
            }}
          >
            Password Login
          </button>
          <button
            className={`tab ${loginMode === 'face' ? 'active' : ''}`}
            onClick={() => {
              setLoginMode('face')
              setError('')
            }}
          >
            Face Recognition (AI)
          </button>
        </div>

        {loginMode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="login-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="login-hint">
              <p>?? Admin, Staff, Parent: Use username & password</p>
            </div>
          </form>
        ) : (
          <div className="face-login-container">
            <p className="face-instruction">
              Position your face in the camera and click "Authenticate"
            </p>

            {!showCamera ? (
              <button
                className="btn btn-primary"
                onClick={() => setShowCamera(true)}
              >
                Open Camera
              </button>
            ) : (
              <>
                <div className="webcam-container">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: "user"
                    }}
                  />
                </div>

                <div className="face-actions">
                  <button
                    className="btn btn-success"
                    onClick={handleFaceLogin}
                    disabled={loading}
                  >
                    {loading ? 'Authenticating...' : 'Authenticate with Face'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowCamera(false)}
                  >
                    Close Camera
                  </button>
                </div>
              </>
            )}


          </div>
        )}


      </div>
    </div>
  )
}

export default Login