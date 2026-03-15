import axios from 'axios'

const API_BASE_URL = 'http://mark-base-backend.railway.internal:8000'


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ===========================
// Authentication APIs
// ===========================

export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password })
    return response.data
  },

  loginWithFace: async (imageFile) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    const response = await api.post('/api/auth/login/face', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// ===========================
// Admin APIs
// ===========================

export const adminAPI = {
  // Departments
  getDepartments: async () => {
    const response = await api.get('/api/admin/departments')
    return response.data
  },

  createDepartment: async (data) => {
    const response = await api.post('/api/admin/departments', data)
    return response.data
  },

  deleteDepartment: async (id) => {
    const response = await api.delete(`/api/admin/departments/${id}`)
    return response.data
  },

  // Classes
  getClasses: async () => {
    const response = await api.get('/api/admin/classes')
    return response.data
  },

  createClass: async (data) => {
    const response = await api.post('/api/admin/classes', data)
    return response.data
  },

  deleteClass: async (id) => {
    const response = await api.delete(`/api/admin/classes/${id}`)
    return response.data
  },

  // Divisions
  getDivisions: async (classId) => {
    const params = classId ? { class_id: classId } : {}
    const response = await api.get('/api/admin/divisions', { params })
    return response.data
  },

  createDivision: async (data) => {
    const response = await api.post('/api/admin/divisions', data)
    return response.data
  },

  deleteDivision: async (id) => {
    const response = await api.delete(`/api/admin/divisions/${id}`)
    return response.data
  },

  // Batches
  getBatches: async () => {
    const response = await api.get('/api/admin/batches')
    return response.data
  },

  createBatch: async (data) => {
    const response = await api.post('/api/admin/batches', data)
    return response.data
  },

  deleteBatch: async (id) => {
    const response = await api.delete(`/api/admin/batches/${id}`)
    return response.data
  },

  // Subjects
  getSubjects: async () => {
    const response = await api.get('/api/admin/subjects')
    return response.data
  },

  createSubject: async (data) => {
    const response = await api.post('/api/admin/subjects', data)
    return response.data
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/api/admin/subjects/${id}`)
    return response.data
  },

  // Staff
  getStaff: async () => {
    const response = await api.get('/api/admin/staff')
    return response.data
  },

  createStaff: async (data) => {
    const response = await api.post('/api/admin/staff', data)
    return response.data
  },

  updateStaff: async (id, data) => {
    const response = await api.put(`/api/admin/staff/${id}`, data)
    return response.data
  },

  deleteStaff: async (id) => {
    const response = await api.delete(`/api/admin/staff/${id}`)
    return response.data
  },

  getAnalytics: async (days) => {
    const response = await api.get(`/api/admin/analytics?days=${days}`)
    return response.data
  },

  // Students
  getStudents: async () => {
    const response = await api.get('/api/admin/students')
    return response.data
  },

  createStudent: async (data) => {
    const response = await api.post('/api/admin/students', data)
    return response.data
  },

  updateStudent: async (id, data) => {
    const response = await api.put(`/api/admin/students/${id}`, data)
    return response.data
  },

  deleteStudent: async (id) => {
    const response = await api.delete(`/api/admin/students/${id}`)
    return response.data
  },

  uploadStudentFace: async (studentId, imageFile) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    const response = await api.post(`/api/admin/students/${studentId}/face`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  registerStudentFace: async (studentId, imageFile) => {
    const formData = new FormData()
    formData.append('image', imageFile)
    const response = await api.post(`/api/auth/register-face/${studentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Parents
  getParents: async () => {
    const response = await api.get('/api/admin/parents')
    return response.data
  },

  createParent: async (data) => {
    const response = await api.post('/api/admin/parents', data)
    return response.data
  },

  updateParent: async (id, data) => {
    const response = await api.put(`/api/admin/parents/${id}`, data)
    return response.data
  },

  deleteParent: async (id) => {
    const response = await api.delete(`/api/admin/parents/${id}`)
    return response.data
  },

  // Attendance Management (Admin)
  getDivisionAttendance: async (divisionId, date) => {
    const response = await api.get(`/api/admin/attendance/division/${divisionId}/${date}`)
    return response.data
  },

  updateAttendance: async (data) => {
    const response = await api.put('/api/admin/attendance', data)
    return response.data
  },

  bulkUpdateAttendance: async (data) => {
    const response = await api.put('/api/admin/attendance/bulk', data)
    return response.data
  },
}

// ===========================
// Staff APIs
// ===========================

export const staffAPI = {
  // Get staff member details by ID
  getStaffById: async (staffId) => {
    const response = await api.get(`/api/admin/staff/${staffId}`)
    return response.data
  },

  // Get students by division
  getStudentsByDivision: async (divisionId) => {
    const response = await api.get(`/api/staff/division/${divisionId}/students`)
    return response.data
  },

  // Open day-wise attendance session
  openSession: async (divisionId, staffId) => {
    const response = await api.post(`/api/staff/open-session`, { division_id: divisionId }, {
      params: { staff_id: staffId }
    })
    return response.data
  },

  // Close attendance session
  closeSession: async (sessionId, staffId) => {
    const response = await api.post(`/api/staff/close-session/${sessionId}`, null, {
      params: { staff_id: staffId }
    })
    return response.data
  },

  // Get active session for today
  getActiveSession: async (staffId) => {
    const response = await api.get(`/api/staff/active-session/${staffId}`)
    return response.data
  }
}


// ===========================
// Student APIs
// ===========================

export const studentAPI = {
  // Get student dashboard data
  getDashboard: async (studentId) => {
    const response = await api.get(`/api/student/${studentId}/dashboard`)
    return response.data
  },

  // Get student attendance records
  getAttendance: async (studentId, startDate = null, endDate = null) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    const response = await api.get(`/api/student/${studentId}/attendance`, { params })
    return response.data
  },
}

// ===========================
// Parent APIs
// ===========================

export const parentAPI = {
  // Get parent dashboard data (optionally for a specific child)
  getDashboard: async (parentId, studentId = null) => {
    const params = studentId ? { student_id: studentId } : {}
    const response = await api.get(`/api/parent/${parentId}/dashboard`, { params })
    return response.data
  },

  // Get all children linked to this parent
  getChildren: async (parentId) => {
    const response = await api.get(`/api/parent/children/${parentId}`)
    return response.data
  },

  // Get child's daily attendance log (optionally for a specific child)
  getChildAttendance: async (parentId, studentId = null) => {
    const params = studentId ? { student_id: studentId } : {}
    const response = await api.get(`/api/parent/child-daily-log/${parentId}`, { params })
    return response.data
  },
  
  getChildLateRecords: async (parentId, studentId = null) => {
    const params = studentId ? { student_id: studentId } : {}
    const response = await api.get(`/api/parent/child-late-records/${parentId}`, { params })
    return response.data
  },
  
  getChildAbsentRecords: async (parentId, studentId = null) => {
    const params = studentId ? { student_id: studentId } : {}
    const response = await api.get(`/api/parent/child-absent-records/${parentId}`, { params })
    return response.data
  },

  getChildPresentRecords: async (parentId, studentId = null) => {
    const params = studentId ? { student_id: studentId } : {}
    const response = await api.get(`/api/parent/child-present-records/${parentId}`, { params })
    return response.data
  },

  // Add a child to an existing parent
  addChildToParent: async (parentId, studentId) => {
    const response = await api.post(`/api/admin/parents/${parentId}/add-child?student_id=${studentId}`)
    return response.data
  },

  // Remove a child from a parent
  removeChildFromParent: async (parentId, studentId) => {
    const response = await api.delete(`/api/admin/parents/${parentId}/remove-child/${studentId}`)
    return response.data
  }
}

// ===========================
// Day-wise Attendance APIs
// ===========================

export const daywiseAttendanceAPI = {
  // Mark attendance for a student
  markAttendance: async (data) => {
    const response = await api.post('/api/attendance/daywise/mark', data)
    return response.data
  },

  // Mark attendance with face recognition
  markAttendanceWithFace: async (markedBy, imageFile) => {
    const formData = new FormData()
    formData.append('image', imageFile)

    // Step 1: Identify student via face recognition
    let faceResponse
    try {
      faceResponse = await api.post('/api/auth/login/face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Face not recognized. Please try again.'
      throw { response: { data: { detail } } }
    }

    if (!faceResponse.data?.student_id) {
      throw { response: { data: { detail: 'Face recognized but student ID missing from response.' } } }
    }

    // Step 2: Mark attendance with recognized student
    const currentTime = new Date().toTimeString().split(' ')[0]

    const attendanceResponse = await api.post('/api/attendance/daywise/mark', {
      student_id: faceResponse.data.student_id,
      check_in_time: currentTime,
      marked_by: markedBy,
      method: 'face_recognition'
    })

    return {
      ...attendanceResponse.data,
      student_name: faceResponse.data.name,
      student_id: faceResponse.data.student_id
    }
  },

  // Bulk mark for entire division
  bulkMarkAttendance: async (payload) => {
    const response = await api.post('/api/attendance/daywise/bulk-mark', payload)
    return response.data
  },

  // Get attendance for a student
  getStudentAttendance: async (studentId, date = null) => {
    const resolvedDate = date || new Date().toISOString().split('T')[0]
    const response = await api.get(`/api/attendance/daywise/student/${studentId}/${resolvedDate}`)
    return response.data
  },

  // Get attendance for a division
  getDivisionAttendance: async (divisionId, date = null) => {
    const resolvedDate = date || new Date().toISOString().split('T')[0]
    const response = await api.get(`/api/attendance/daywise/division/${divisionId}/${resolvedDate}`)
    return response.data
  },

  // Update attendance
  updateAttendance: async (attendanceId, data) => {
    const response = await api.put(`/api/attendance/daywise/${attendanceId}`, data)
    return response.data
  },

  // Override attendance via toggle
  overrideAttendance: async (divisionId, studentId, date, data) => {
    const response = await api.patch(`/api/attendance/daywise/override/${divisionId}/${studentId}/${date}`, data)
    return response.data
  },

  // Get grace period settings
  getGracePeriod: async (divisionId) => {
    const response = await api.get(`/api/attendance/daywise/grace-period/${divisionId}`)
    return response.data
  },

  // Submit leave request
  submitLeaveRequest: async (data) => {
    const response = await api.post('/api/attendance/daywise/leave-request', data)
    return response.data
  },

  // Get leave requests
  getLeaveRequests: async (studentId = null) => {
    const params = studentId ? { student_id: studentId } : {}
    const response = await api.get('/api/attendance/daywise/leave-requests', { params })
    return response.data
  },

  // Approve/reject leave request
  updateLeaveRequest: async (requestId, status) => {
    const response = await api.put(`/api/attendance/daywise/leave-request/${requestId}`, { status })
    return response.data
  },
}

export default api

