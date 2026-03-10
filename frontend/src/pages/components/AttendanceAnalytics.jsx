import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../../styles/dashboard.css";

/**
 * Attendance Analytics Component
 * @param {Object} props
 * @param {Array} props.data - Array of { date, department, present, absent, late, total }
 * @param {Array} props.departments - Array of strings
 * @param {number} props.dateRange - Filter size
 * @param {function} props.onDateRangeChange - Callback for range switch
 */
function AttendanceAnalytics({ data = [], departments = [], dateRange = 30, onDateRangeChange }) {
  const [selectedDept, setSelectedDept] = useState("All Departments");

  // 1. Process data for filter
  const filteredData = useMemo(() => {
    if (selectedDept === "All Departments") {
      // Group by date, sum across all departments
      const agg = {};
      data.forEach(item => {
        if (!agg[item.date]) {
          agg[item.date] = { date: item.date, present: 0, absent: 0, late: 0, total: 0 };
        }
        agg[item.date].present += item.present;
        agg[item.date].absent += item.absent;
        agg[item.date].late += item.late;
        agg[item.date].total += item.total;
      });
      return Object.values(agg).sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      // Filter by strict department
      return data
        .filter(item => item.department === selectedDept)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  }, [data, selectedDept]);

  // 2. Compute aggregate metrics
  const metrics = useMemo(() => {
    let totals = { present: 0, absent: 0, late: 0, total: 0 };
    filteredData.forEach(d => {
      totals.present += d.present;
      totals.absent += d.absent;
      totals.late += d.late;
      totals.total += d.total;
    });

    return {
      rate: totals.total > 0 ? (totals.present / totals.total) * 100 : 0,
      absentRate: totals.total > 0 ? (totals.absent / totals.total) * 100 : 0,
      lateRate: totals.total > 0 ? (totals.late / totals.total) * 100 : 0,
      totalRecords: totals.total
    };
  }, [filteredData]);

  // 3. Prepare Chart Data (Adding computed % per day)
  const chartData = useMemo(() => {
    return filteredData.map(d => ({
      date: d.date,
      AttendanceRate: d.total > 0 ? ((d.present / d.total) * 100).toFixed(1) : 0,
      Present: d.present,
      Absent: d.absent,
      Late: d.late
    }));
  }, [filteredData]);

  // 4. Lowest Attendance Days logic
  const topLowDays = [...chartData]
    .sort((a, b) => parseFloat(a.AttendanceRate) - parseFloat(b.AttendanceRate))
    .slice(0, 5);

  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center", color: "#666" }}>
        No attendance records found for the global analytics engine over the past {dateRange} days.
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* Controls Bar */}
      <div className="analytics-controls" style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label htmlFor="dept-filter" style={{ fontSize: "14px", fontWeight: "600", marginBottom: "5px" }}>Department</label>
          <select
            id="dept-filter"
            aria-label="Filter analytics by Department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          >
            <option value="All Departments">All Departments</option>
            {departments.map((d, i) => (
              <option key={i} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label htmlFor="range-filter" style={{ fontSize: "14px", fontWeight: "600", marginBottom: "5px" }}>Time Range</label>
          <select
            id="range-filter"
            aria-label="Select Date Range"
            value={dateRange}
            onChange={(e) => onDateRangeChange(parseInt(e.target.value))}
            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-3" style={{ marginBottom: "20px" }}>
        <div className="card stat-card">
          <h3>Present Rate</h3>
          <div className="stat-large text-success">{metrics.rate.toFixed(1)}%</div>
          <p className="text-muted">Avg over {filteredData.length} days</p>
        </div>
        <div className="card stat-card">
          <h3>Absence Rate</h3>
          <div className="stat-large text-danger">{metrics.absentRate.toFixed(1)}%</div>
          <p className="text-muted">Missed classes</p>
        </div>
        <div className="card stat-card">
          <h3>Tardiness Rate</h3>
          <div className="stat-large text-warning">{metrics.lateRate.toFixed(1)}%</div>
          <p className="text-muted">Checking in Late</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="card-header">Attendance Velocity (Rate %)</div>
        <div className="chart-wrapper" style={{ height: "350px", width: "100%", padding: "10px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} tabIndex={0} aria-label="Attendance rate line chart">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#666' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#666' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #ccc', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                formatter={(value, name) => [name === 'AttendanceRate' ? `${value}%` : value, name === 'AttendanceRate' ? 'Attendance' : name]}
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="AttendanceRate" stroke="#4caf50" strokeWidth={3} activeDot={{ r: 8 }} name="Attendance %" />
              <Line type="monotone" dataKey="Late" stroke="#ff9800" strokeWidth={2} name="Late Marks" />
              <Line type="monotone" dataKey="Absent" stroke="#f44336" strokeWidth={2} name="Absent Marks" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw Data & Lowest Days Table */}
      <div className="grid grid-2">
        {/* Raw Table */}
        <div className="card">
          <div className="card-header">Log Table ({dateRange} Days)</div>
          <div className="table-responsive" style={{ maxHeight: "350px", overflowY: "auto" }}>
            <table className="table" aria-label="Detailed daily metrics log table">
              <thead style={{ position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 }}>
                <tr>
                  <th>Date</th>
                  <th>Rate</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Absent</th>
                </tr>
              </thead>
              <tbody>
                {[...chartData].reverse().map((row, i) => (
                  <tr key={i}>
                    <td>{row.date}</td>
                    <td>
                      <span className={`badge ${row.AttendanceRate >= 75 ? 'badge-present' : 'badge-absent'}`}>
                        {row.AttendanceRate}%
                      </span>
                    </td>
                    <td className="text-success">{row.Present}</td>
                    <td className="text-warning">{row.Late}</td>
                    <td className="text-danger">{row.Absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lowest Alerts */}
        <div className="card">
          <div className="card-header">Top Lowest Attendance Days</div>
          <div className="alerts-grid">
            {topLowDays.map((d, i) => (
              <div key={i} className="alert-item" style={{ display: "flex", justifyContent: "space-between", padding: "12px", borderBottom: "1px solid #eee" }}>
                <strong>{d.date}</strong>
                <span style={{ color: '#f44336', fontWeight: "bold" }}>{d.AttendanceRate}% </span>
              </div>
            ))}
            {topLowDays.length === 0 && <p style={{ padding: "20px", color: "#888", textAlign: "center" }}>No metrics recorded to evaluate low bounds.</p>}
          </div>
        </div>
      </div>

    </div>
  );
}

export default AttendanceAnalytics;
