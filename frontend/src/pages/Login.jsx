/**
 * Unified Login Page for all user roles.
 * Supports password-based and face recognition authentication.
 * Face recognition now works automatically - just open camera and it detects!
 */

import React, { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, Loader } from 'lucide-react'
import Webcam from 'react-webcam'
import { authAPI } from '../services/api'
import ThemeToggle from '../components/ThemeToggle'
import '../styles/login.css'

function Login({ onLogin }) {
  const [loginMode, setLoginMode] = useState('password') // 'password' or 'face'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('Initializing camera...')
  const [faceRecognized, setFaceRecognized] = useState(false)
  const [timeoutSeconds, setTimeoutSeconds] = useState(30)
  const [cameraTimedOut, setCameraTimedOut] = useState(false)
  const webcamRef = useRef(null)
  const faceAuthIntervalRef = useRef(null)
  const timeoutIntervalRef = useRef(null)
  const processingRef = useRef(false)

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userData = await authAPI.login(username, password)
      onLogin(userData)
    } catch (err) {
      console.error("Login error:", err)
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Automatic face recognition - runs continuously every 1.5 seconds
  const attemptFaceAuth = async () => {
    if (processingRef.current || !showCamera || faceRecognized) return
    
    processingRef.current = true
    
    try {
      const imageSrc = webcamRef.current?.getScreenshot()
      if (!imageSrc) {
        setFaceDetectionStatus('No camera feed. Please allow camera access.')
        processingRef.current = false
        return
      }

      setFaceDetectionStatus('Analyzing face...')

      // Convert base64 to blob and File
      const blob = await fetch(imageSrc).then(r => r.blob())
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' })

      // Try to authenticate with face
      const userData = await authAPI.loginWithFace(file)
      
      // Success! Face was recognized
      setFaceRecognized(true)
      setFaceDetectionStatus(`Face recognized! Welcome, ${userData.name}`)
      console.log("Face login successful:", userData)
      
      // Automatically log in the user
      setTimeout(() => {
        onLogin(userData)
      }, 500)
      
    } catch (err) {
      // Face not recognized - keep trying
      const errorMsg = err.response?.data?.detail || 'Face not in database'
      console.log("Face not recognized:", errorMsg)
      setFaceDetectionStatus(errorMsg)
    } finally {
      processingRef.current = false
    }
  }

  // Auto-start face recognition interval when camera is opened
  useEffect(() => {
    if (showCamera && loginMode === 'face') {
      setFaceDetectionStatus('Looking for your face... (Make sure to allow camera access)')
      setFaceRecognized(false)
      setCameraTimedOut(false)
      setTimeoutSeconds(30)
      
      // Start automatic face recognition every 1.5 seconds
      faceAuthIntervalRef.current = setInterval(() => {
        attemptFaceAuth()
      }, 1500)
      
      // Start 30-second countdown timer
      timeoutIntervalRef.current = setInterval(() => {
        setTimeoutSeconds(prev => {
          if (prev <= 1) {
            // Time's up - stop face recognition
            setCameraTimedOut(true)
            setFaceDetectionStatus('Camera timeout (30s). Click "Try Again" to restart.')
            if (faceAuthIntervalRef.current) {
              clearInterval(faceAuthIntervalRef.current)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      return () => {
        if (faceAuthIntervalRef.current) {
          clearInterval(faceAuthIntervalRef.current)
        }
        if (timeoutIntervalRef.current) {
          clearInterval(timeoutIntervalRef.current)
        }
      }
    }
  }, [showCamera, loginMode])

  // Clean up intervals when component unmounts or face is recognized
  useEffect(() => {
    return () => {
      if (faceAuthIntervalRef.current) {
        clearInterval(faceAuthIntervalRef.current)
      }
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="login-container">
      <div className="login-card" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <ThemeToggle />
        </div>
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
              <p>Admin, Staff, Parent: use username and password.</p>
            </div>
          </form>
        ) : (
          <div className="face-login-container">
            <p className="face-instruction">
              Position your face in the front of camera - automatic detection will log you in instantly!
            </p>

            {!showCamera ? (
              <button
                className="btn btn-primary"
                onClick={() => setShowCamera(true)}
              >
                📷 Open Camera (Auto-Detect)
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
                  
                  {/* Status overlay on top of camera */}
                  <div className="face-status-overlay">
                    <div className="status-badge">
                      <Loader size={16} className={cameraTimedOut ? 'hidden' : 'spinner'} />
                      <span>{faceDetectionStatus}</span>
                    </div>
                    
                    {/* Countdown timer */}
                    {!cameraTimedOut && (
                      <div className="countdown-timer">
                        {timeoutSeconds}s
                      </div>
                    )}
                  </div>
                </div>

                <div className="face-actions">
                  {cameraTimedOut ? (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setTimeoutSeconds(30)
                          setCameraTimedOut(false)
                          setFaceDetectionStatus('Looking for your face... (Make sure to allow camera access)')
                          setFaceRecognized(false)
                          
                          // Restart face recognition
                          faceAuthIntervalRef.current = setInterval(() => {
                            attemptFaceAuth()
                          }, 1500)
                          
                          // Restart countdown
                          timeoutIntervalRef.current = setInterval(() => {
                            setTimeoutSeconds(prev => {
                              if (prev <= 1) {
                                setCameraTimedOut(true)
                                setFaceDetectionStatus('Camera timeout (30s). Click "Try Again" to restart.')
                                if (faceAuthIntervalRef.current) {
                                  clearInterval(faceAuthIntervalRef.current)
                                }
                                return 0
                              }
                              return prev - 1
                            })
                          }, 1000)
                        }}
                      >
                        🔄 Try Again
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowCamera(false)
                          setFaceDetectionStatus('Initializing camera...')
                          setFaceRecognized(false)
                          setCameraTimedOut(false)
                        }}
                      >
                        Close Camera
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowCamera(false)
                        setFaceDetectionStatus('Initializing camera...')
                        setFaceRecognized(false)
                        setCameraTimedOut(false)
                      }}
                    >
                      Close Camera
                    </button>
                  )}
                </div>

                {faceRecognized && (
                  <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                    ✅ Face recognized! Logging you in...
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
