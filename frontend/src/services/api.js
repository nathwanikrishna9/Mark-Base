/**
 * API service for communicating with backend.
 * Handles all HTTP requests to FastAPI backend.
 */

import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('markbase_user') || '{}')
  if (user.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  return config
})

// ===========================
// Authentication APIs
// ===========================

export const authAPI = {
  // Login with username and password (Admin, Staff, Parent)
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password })
    return response.data
  },

  // Login with face recognition (Student)
  loginWithFace: async (imageFile) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    
    const response = await api.post('/api/auth/login/face', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // Register student face (first-time setup)
  registerFace: async (studentId, imageFile) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    
    const response = await api.post(`/api/auth/register-face/${studentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}

// ===========================
// Admin APIs
// ===========================

export const adminAPI = {
  // Departments
  createDepartment: async (data) => {
    const response = await api.post('/api/admin/departments', data)
    return response.data
  },
  
  getDepartments: async () => {
    const response = await api.get('/api/admin/departments')
    return response.data
  },

  // Classes
  createClass: async (data) => {
    const response = await api.post('/api/admin/classes', data)
    return response.data
  },
  
  getClasses: async (departmentId = null) => {
    const response = await api.get('/api/admin/classes', {
      params: { department_id: departmentId }
    })
    return response.data
  },

  // Divisions
  createDivision: async (data) => {
    const response = await api.post('/api/admin/divisions', data)
    return response.data
  },
  
  getDivisions: async (classId = null) => {
    const response = await api.get('/api/admin/divisions', {
      params: { class_id: classId }
    })
    return response.data
  },

  // Batches
  createBatch: async (data) => {
    const response = await api.post('/api/admin/batches', data)
    return response.data
  },
  
  getBatches: async (divisionId = null) => {
    const response = await api.get('/api/admin/batches', {
      params: { division_id: divisionId }
    })
    return response.data
  },

  // Subjects
  createSubject: async (data) => {
    const response = await api.post('/api/admin/subjects', data)
    return response.data
  },
  
  getSubjects: async (classId = null) => {
    const response = await api.get('/api/admin/subjects', {
      params: { class_id: classId }
    })
    return response.data
  },

  // Staff
  createStaff: async (data) => {
    const response = await api.post('/api/admin/staff', data)
    return response.data
  },
  
  getStaff: async (departmentId = null) => {
    const response = await api.get('/api/admin/staff', {
      params: { department_id: departmentId }
    })
    return response.data
  },

  // Students
  createStudent: async (data) => {
    const response = await api.post('/api/admin/students', data)
    return response.data
  },
  
  getStudents: async (divisionId = null, batchId = null) => {
    const response = await api.get('/api/admin/students', {
      params: { division_id: divisionId, batch_id: batchId }
    })
    return response.data
  },
  
  registerStudentFace: async (studentId, formData) => {
    const response = await api.post(`/api/auth/register-face/${studentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // Parents
  createParent: async (data) => {
    const response = await api.post('/api/admin/parents', data)
    return response.data
  },
  
  getParents: async (studentId = null) => {
    const response = await api.get('/api/admin/parents', {
      params: { student_id: studentId }
    })
    return response.data
  },

  // Delete endpoints
  deleteStudent: async (studentId) => {
    const response = await api.delete(`/api/admin/students/${studentId}`)
    return response.data
  },

  deleteStaff: async (staffId) => {
    const response = await api.delete(`/api/admin/staff/${staffId}`)
    return response.data
  },

  deleteParent: async (parentId) => {
    const response = await api.delete(`/api/admin/parents/${parentId}`)
    return response.data
  },

  deleteDepartment: async (departmentId) => {
    const response = await api.delete(`/api/admin/departments/${departmentId}`)
    return response.data
  },

  deleteClass: async (classId) => {
    const response = await api.delete(`/api/admin/classes/${classId}`)
    return response.data
  },

  deleteDivision: async (divisionId) => {
    const response = await api.delete(`/api/admin/divisions/${divisionId}`)
    return response.data
  },

  // Edit attendance status
  editAttendanceStatus: async (recordId, status, adminId) => {
    const response = await api.put(
      `/api/admin/attendance/${recordId}`,
      { status },
      { params: { admin_id: adminId } }
    )
    return response.data
  },
}

// ===========================
// Staff APIs
// ===========================

export const staffAPI = {
  // Get active sessions for staff
  getActiveSessions: async (staffId) => {
    const response = await api.get(`/api/staff/active-sessions/${staffId}`)
    return response.data
  },

  // Open attendance session
  openSession: async (timetableSessionId, staffId) => {
    const response = await api.post(`/api/staff/open-session/${timetableSessionId}`, null, {
      params: { staff_id: staffId }
    })
    return response.data
  },

  // Mark attendance with face recognition
  markAttendanceWithFace: async (attendanceSessionId, staffId, imageFile) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    
    const response = await api.post(
      `/api/staff/mark-attendance/${attendanceSessionId}`,
      formData,
      {
        params: { staff_id: staffId },
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    )
    return response.data
  },

  // Get open attendance sessions (public, optionally filtered by division)
  getOpenSessions: async (divisionId = null) => {
    const params = divisionId ? { division_id: divisionId } : {}
    const response = await api.get('/api/staff/open-sessions', { params })
    return response.data
  },

  // Mark attendance manually (fallback)
  markAttendanceManual: async (attendanceSessionId, staffId, studentId) => {
    const response = await api.post(
      `/api/staff/mark-attendance/${attendanceSessionId}/manual`,
      { student_id: studentId },
      { params: { staff_id: staffId } }
    )
    return response.data
  },

  // Close attendance session
  closeSession: async (attendanceSessionId, staffId) => {
    const response = await api.post(`/api/staff/close-session/${attendanceSessionId}`, null, {
      params: { staff_id: staffId }
    })
    return response.data
  },

  // Get session status
  getSessionStatus: async (attendanceSessionId) => {
    const response = await api.get(`/api/staff/session-status/${attendanceSessionId}`)
    return response.data
  },

  // Get staff timetable
  getMyTimetable: async (staffId) => {
    const response = await api.get(`/api/staff/my-timetable/${staffId}`)
    return response.data
  },
}

// ===========================
// Student APIs
// ===========================

export const studentAPI = {
  // Get my attendance summary
  getMyAttendance: async (studentId) => {
    const response = await api.get(`/api/student/my-attendance/${studentId}`)
    return response.data
  },

  // Get attendance by subject
  getAttendanceBySubject: async (studentId, subjectId) => {
    const response = await api.get(`/api/student/attendance/subject/${studentId}/${subjectId}`)
    return response.data
  },

  // Get overall attendance
  getOverallAttendance: async (studentId) => {
    const response = await api.get(`/api/student/attendance/overall/${studentId}`)
    return response.data
  },

  // Get dashboard data
  getDashboard: async (studentId) => {
    const response = await api.get(`/api/student/dashboard/${studentId}`)
    return response.data
  },
}

// ===========================
// Parent APIs
// ===========================

export const parentAPI = {
  // Get child info
  getChildInfo: async (parentId) => {
    const response = await api.get(`/api/parent/child-info/${parentId}`)
    return response.data
  },

  // Get child attendance
  getChildAttendance: async (parentId) => {
    const response = await api.get(`/api/parent/child-attendance/${parentId}`)
    return response.data
  },

  // Get daily log
  getChildDailyLog: async (parentId, limit = 30) => {
    const response = await api.get(`/api/parent/child-daily-log/${parentId}`, {
      params: { limit }
    })
    return response.data
  },

  // Get late records
  getChildLateRecords: async (parentId) => {
    const response = await api.get(`/api/parent/child-late-records/${parentId}`)
    return response.data
  },

  // Get absent records
  getChildAbsentRecords: async (parentId) => {
    const response = await api.get(`/api/parent/child-absent-records/${parentId}`)
    return response.data
  },

  // Get dashboard
  getDashboard: async (parentId) => {
    const response = await api.get(`/api/parent/dashboard/${parentId}`)
    return response.data
  },
}

// ===========================
// Timetable APIs
// ===========================

export const timetableAPI = {
  // Create timetable session
  createSession: async (data) => {
    const response = await api.post('/api/timetable/sessions', data)
    return response.data
  },

  // Get division timetable
  getDivisionTimetable: async (divisionId, day = null) => {
    const response = await api.get(`/api/timetable/division/${divisionId}`, {
      params: { day }
    })
    return response.data
  },

  // Get staff timetable
  getStaffTimetable: async (staffId) => {
    const response = await api.get(`/api/timetable/staff/${staffId}`)
    return response.data
  },
}

export default api
