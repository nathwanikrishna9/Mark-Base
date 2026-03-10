/**
 * Parent Dashboard - View child's attendance data.
 * Features:
 * - View child's overall attendance
 * - View late and absent records
 * - View daily attendance log
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

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      // The user object contains parent_id
      const pId = user.parent_id || user.id;

      const [dashData, logData, lateData, absentData] = await Promise.all([
        parentAPI.getDashboard(pId),
        parentAPI.getChildAttendance(pId), // returns the daily log
        parentAPI.getChildLateRecords(pId),
        parentAPI.getChildAbsentRecords(pId)
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


  // Process data for a 7-day or 10-day bar chart showing recent attendance
  // Reversing so that oldest is on the left, newest on the right
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
              Child: {dashboard.child_info.name} ({dashboard.child_info.roll_number})
            </p>
          )}
        </div>
        <button className="btn btn-danger" onClick={onLogout}>Logout</button>
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
