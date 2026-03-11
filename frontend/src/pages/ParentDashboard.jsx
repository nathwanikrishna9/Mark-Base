/**
 * Parent Dashboard - View child's attendance data.
 * Features:
 * - View child's overall attendance
 * - View late and absent records
 * - View daily attendance log
 * - Switch between multiple children (child switcher dropdown)
 */

import React, { useState, useEffect } from 'react'
import { parentAPI } from '../services/api'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import '../styles/dashboard.css'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function ParentDashboard({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(null)
  const [dailyLog, setDailyLog] = useState([])
  const [lateRecords, setLateRecords] = useState(null)
  const [absentRecords, setAbsentRecords] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  // Multi-child support
  const [children, setChildren] = useState(user.children || [])
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [childDropdownOpen, setChildDropdownOpen] = useState(false)

  useEffect(() => {
    // If children came from login data, use them; otherwise fetch from API
    if (user.children && user.children.length > 0) {
      setChildren(user.children)
      setSelectedChildId(user.children[0].student_id)
    } else {
      // Fetch children from API
      loadChildren()
    }
  }, [])

  useEffect(() => {
    if (selectedChildId) {
      loadAllData(selectedChildId)
    }
  }, [selectedChildId])

  const loadChildren = async () => {
    try {
      const pId = user.parent_id || user.id
      const childrenData = await parentAPI.getChildren(pId)
      setChildren(childrenData)
      if (childrenData.length > 0) {
        setSelectedChildId(childrenData[0].student_id)
      }
    } catch (err) {
      console.error('Failed to load children:', err)
    }
  }

  const loadAllData = async (studentId) => {
    setLoading(true)
    try {
      const pId = user.parent_id || user.id

      const [dashData, logData, lateData, absentData] = await Promise.all([
        parentAPI.getDashboard(pId, studentId),
        parentAPI.getChildAttendance(pId, studentId),
        parentAPI.getChildLateRecords(pId, studentId),
        parentAPI.getChildAbsentRecords(pId, studentId)
      ])
      
      setDashboard(dashData)
      setDailyLog(logData)
      setLateRecords(lateData)
      setAbsentRecords(absentData)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChildSwitch = (studentId) => {
    setSelectedChildId(studentId)
    setChildDropdownOpen(false)
  }

  const selectedChild = children.find(c => c.student_id === selectedChildId)

  if (loading) {
    return (
      <div className="dashboard">
        <div className="spinner"></div>
      </div>
    )
  }

  // Chart data
  const overallChartData = dashboard ? {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      data: [
        dashboard.overall_statistics.present,
        dashboard.overall_statistics.late,
        dashboard.overall_statistics.absent
      ],
      backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
      borderWidth: 0
    }]
  } : null


  // Process data for a 7-day bar chart showing recent attendance
  const recentDays = dashboard ? [...dashboard.last_7_days_attendance].reverse() : []
  
  const dailyChartData = {
    labels: recentDays.map(a => {
      const dateStr = a.date; 
      const parsed = new Date(dateStr);
      return `${parsed.getDate()}/${parsed.getMonth() + 1}`; 
    }),
    datasets: [{
      label: 'Attendance Status (1=Present, 0.5=Late, 0=Absent)',
      data: recentDays.map(a => {
        if (a.status.toLowerCase() === 'present') return 1;
        if (a.status.toLowerCase() === 'late') return 0.5;
        return 0;
      }),
      backgroundColor: recentDays.map(a => {
        if (a.status.toLowerCase() === 'present') return '#4caf50';
        if (a.status.toLowerCase() === 'late') return '#ff9800';
        return '#f44336';
      }),
    }]
  }


  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Parent Dashboard</h1>
          <p>Welcome, {user.name}</p>
          {dashboard && (
            <p className="text-muted">
              Viewing: {dashboard.child_info.name} ({dashboard.child_info.roll_number})
              {dashboard.child_info.division && ` — ${dashboard.child_info.division}`}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Child Switcher Dropdown */}
          {children.length > 1 && (
            <div className="child-switcher" style={{ position: 'relative' }}>
              <button
                className="btn btn-child-switcher"
                onClick={() => setChildDropdownOpen(!childDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '16px' }}>👶</span>
                <span>{selectedChild ? selectedChild.name : 'Select Child'}</span>
                <span style={{ 
                  fontSize: '10px', 
                  transition: 'transform 0.2s',
                  transform: childDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  ▼
                </span>
              </button>
              
              {childDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 99
                    }}
                    onClick={() => setChildDropdownOpen(false)}
                  />
                  <div
                    className="child-dropdown"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: '280px',
                      background: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      zIndex: 100,
                      overflow: 'hidden',
                      animation: 'slideDown 0.2s ease'
                    }}
                  >
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #eee',
                      fontSize: '12px',
                      color: '#888',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Switch Child
                    </div>
                    {children.map((child) => (
                      <div
                        key={child.student_id}
                        onClick={() => handleChildSwitch(child.student_id)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          borderBottom: '1px solid #f5f5f5',
                          background: child.student_id === selectedChildId 
                            ? 'linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%)' 
                            : '#fff',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (child.student_id !== selectedChildId)
                            e.currentTarget.style.background = '#f8f9fa'
                        }}
                        onMouseLeave={(e) => {
                          if (child.student_id !== selectedChildId)
                            e.currentTarget.style.background = '#fff'
                        }}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: child.student_id === selectedChildId 
                            ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                            : '#e0e0e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: child.student_id === selectedChildId ? '#fff' : '#666',
                          fontSize: '14px',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {child.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: '14px', 
                            color: '#333' 
                          }}>
                            {child.name}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#888',
                            marginTop: '2px'
                          }}>
                            {child.roll_number}
                            {child.department && ` • ${child.department}`}
                            {child.class_name && ` • ${child.class_name}`}
                            {child.division && ` — Div ${child.division}`}
                          </div>
                        </div>
                        {child.student_id === selectedChildId && (
                          <span style={{ color: '#667eea', fontSize: '16px' }}>✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button className="btn btn-danger" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="container">
        {/* Navigation Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            Daily Log
          </button>
          <button
            className={`tab ${activeTab === 'late' ? 'active' : ''}`}
            onClick={() => setActiveTab('late')}
          >
            Late Entries
          </button>
          <button
            className={`tab ${activeTab === 'absent' ? 'active' : ''}`}
            onClick={() => setActiveTab('absent')}
          >
            Absences
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboard && (
          <>
            <div className="grid grid-3">
              <div className="card stat-card">
                <h3>Overall Attendance</h3>
                <div className="stat-large">{dashboard.overall_statistics.percentage.toFixed(1)}%</div>
                <p className="text-muted">{dashboard.overall_statistics.total} total days logged</p>
              </div>
              
              <div className="card stat-card">
                <h3>Recent Late Entries</h3>
                <div className="stat-large text-warning">{dashboard.recent_late_count}</div>
                <p className="text-muted">Last 7 days</p>
              </div>
              
              <div className="card stat-card">
                <h3>Recent Absences</h3>
                <div className="stat-large text-danger">{dashboard.recent_absent_count}</div>
                <p className="text-muted">Last 7 days</p>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="card">
                <div className="card-header">Attendance Distribution</div>
                {overallChartData && (
                  <div className="chart-container" style={{ position: 'relative', minHeight: '300px' }}>
                    <Pie data={overallChartData} options={{ maintainAspectRatio: false }} />
                  </div>
                )}
              </div>

               <div className="card">
                <div className="card-header">Last {recentDays.length} Days View</div>
                {recentDays.length > 0 ? (
                  <div className="chart-container" style={{ position: 'relative', minHeight: '300px' }}>
                    <Bar 
                      data={dailyChartData} 
                      options={{
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 1,
                            ticks: {
                              callback: function(value) {
                                if (value === 1) return 'Present';
                                if (value === 0.5) return 'Late';
                                if (value === 0) return 'Absent';
                                return '';
                              }
                            }
                          }
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const val = context.raw;
                                if (val === 1) return 'Present';
                                if (val === 0.5) return 'Late';
                                return 'Absent';
                              }
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                        No recent attendance data.
                    </div>
                )}
               </div>
            </div>
          </>
        )}


        {/* Daily Log Tab */}
        {activeTab === 'daily' && (
          <div className="card">
            <div className="card-header">Daily Attendance Log (Last 30 Days)</div>
            <div className="table-responsive">
                <table className="table">
                <thead>
                    <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Status</th>
                    <th>Time In</th>
                    </tr>
                </thead>
                <tbody>
                    {dailyLog.length > 0 ? dailyLog.map((record, index) => (
                    <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.day}</td>
                        <td>
                        <span className={`badge badge-${record.status.toLowerCase() === 'present' ? 'success' : (record.status.toLowerCase() === 'late' ? 'warning' : 'danger')}`}>
                            {record.status}
                        </span>
                        </td>
                        <td>{record.marked_at !== 'N/A' ? record.marked_at : '-'}</td>
                    </tr>
                    )) : (
                        <tr><td colSpan="4" style={{textAlign:"center", padding: "10px"}}>No daily log records available.</td></tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
        )}

        {/* Late Entries Tab */}
        {activeTab === 'late' && lateRecords && (
          <div className="card">
            <div className="card-header">Late Entries ({lateRecords.total_late_entries})</div>
            <div className="table-responsive">
                <table className="table">
                <thead>
                    <tr>
                    <th>Date</th>
                    <th>Marked At</th>
                    </tr>
                </thead>
                <tbody>
                    {lateRecords.late_records.length > 0 ? lateRecords.late_records.map((record, index) => (
                    <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.marked_at}</td>
                    </tr>
                    )) : (
                        <tr><td colSpan="2" style={{textAlign:"center", padding: "10px"}}>No late records found.</td></tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
        )}

        {/* Absences Tab */}
        {activeTab === 'absent' && absentRecords && (
          <div className="card">
            <div className="card-header">Absences ({absentRecords.total_absences})</div>
            <div className="table-responsive">
                <table className="table">
                <thead>
                    <tr>
                    <th>Date</th>
                    <th>Day</th>
                    </tr>
                </thead>
                <tbody>
                    {absentRecords.absent_records.length > 0 ? absentRecords.absent_records.map((record, index) => (
                    <tr key={index}>
                        <td>{record.date}</td>
                        <td>{record.day}</td>
                    </tr>
                    )) : (
                         <tr><td colSpan="2" style={{textAlign:"center", padding: "10px"}}>No absences recorded.</td></tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ParentDashboard
