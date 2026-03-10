/**
 * Student Dashboard - View-only interface for students.
 * Features:
 * - View day-wise attendance
 * - View attendance percentage
 * - View late entries
 * - View recent day-wise entries
 */

import React, { useState, useEffect } from 'react'
import { studentAPI } from '../services/api'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import '../styles/dashboard.css'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function StudentDashboard({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
    loadAttendance()
  }, [])

  const loadDashboard = async () => {
    try {
      const data = await studentAPI.getDashboard(user.student_id)
      setDashboard(data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAttendance = async () => {
    try {
      const data = await studentAPI.getAttendance(user.student_id)
      setAttendance(data)
    } catch (err) {
      console.error('Failed to load attendance:', err)
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="spinner"></div>
      </div>
    )
  }

  // Chart data for overall attendance
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
  const recentDays = dashboard ? [...dashboard.recent_attendance].reverse() : []

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
          <h1>Student Dashboard</h1>
          <p>Welcome, {dashboard ? dashboard.student_info.name : user.name}</p>
          <p className="text-muted">Roll: {dashboard ? dashboard.student_info.roll_number : user.roll_number}</p>
        </div>
        <button className="btn btn-danger" onClick={onLogout}>Logout</button>
      </div>

      <div className="container">
        {/* Overall Statistics */}
        {dashboard && (
          <div className="grid grid-4">
            <div className="card stat-card">
              <h3>Overall Attendance</h3>
              <div className="stat-large">{dashboard.overall_statistics.percentage.toFixed(1)}%</div>
              <p className="text-muted">{dashboard.overall_statistics.total} days logged</p>
            </div>

            <div className="card stat-card">
              <h3>Present</h3>
              <div className="stat-large text-success">{dashboard.overall_statistics.present}</div>
              <p className="text-muted">On time</p>
            </div>

            <div className="card stat-card">
              <h3>Late Entries</h3>
              <div className="stat-large text-warning">{dashboard.late_entries_count}</div>
              <p className="text-muted">After grace period</p>
            </div>

            <div className="card stat-card">
              <h3>Absent</h3>
              <div className="stat-large text-danger">{dashboard.overall_statistics.absent}</div>
              <p className="text-muted">Missed classes</p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">Overall Attendance Distribution</div>
            {overallChartData && (
              <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
                <Pie data={overallChartData} options={{ maintainAspectRatio: false }} />
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">Recent Day-wise Attendance (Last {recentDays.length} Days)</div>
            {recentDays.length > 0 ? (
              <div className="chart-container" style={{ position: 'relative', height: '300px' }}>
                <Bar
                  data={dailyChartData}
                  options={{
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                          callback: function (value) {
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
                          label: function (context) {
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

        {/* Day-wise Details Grid */}
        <div className="card">
          <div className="card-header">Day-wise Attendance Details</div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Check-in Time</th>
                  <th>Marking Method</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length > 0 ? (
                  attendance.map((att, index) => (
                    <tr key={index}>
                      <td>{att.date}</td>
                      <td>
                        <span className={`badge badge-${att.status.toLowerCase() === 'present' ? 'success' : (att.status.toLowerCase() === 'late' ? 'warning' : 'danger')}`} style={{ padding: '5px 10px', borderRadius: '4px' }}>
                          {att.status}
                        </span>
                      </td>
                      <td>{att.check_in_time !== 'N/A' && att.check_in_time !== '00:00:00' ? att.check_in_time : '-'}</td>
                      <td>{att.marked_method !== 'unknown' ? att.marked_method.replace('_', ' ').toUpperCase() : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No daily attendance records available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
