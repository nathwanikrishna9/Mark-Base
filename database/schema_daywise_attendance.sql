-- ========================================
-- DAY-WISE ATTENDANCE SCHEMA
-- Replaces lecture-based attendance with daily attendance
-- Grace Period: 9:15 AM - 9:30 AM
-- ========================================

-- Drop old attendance tables (if converting)
-- DROP TABLE IF EXISTS attendance_records;
-- DROP TABLE IF EXISTS attendance_sessions;

-- Daily Attendance Records Table
-- One record per student per day (not per lecture)
CREATE TABLE IF NOT EXISTS daily_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    division_id INTEGER NOT NULL,
    date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    status VARCHAR(10) NOT NULL CHECK(status IN ('present', 'late', 'absent')),
    marked_by INTEGER,  -- staff_id who marked (NULL for face recognition)
    marked_method VARCHAR(20) CHECK(marked_method IN ('face_recognition', 'manual', 'system')),
    edited_by INTEGER,  -- admin_id if edited
    edited_at TIMESTAMP,
    notes TEXT,  -- Optional notes (e.g., "Medical leave", "Late due to traffic")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES staff(id) ON DELETE SET NULL,
    FOREIGN KEY (edited_by) REFERENCES staff(id) ON DELETE SET NULL,
    UNIQUE(student_id, date)  -- One attendance record per student per day
);

-- Attendance Configuration Table
-- Stores grace period and attendance rules
CREATE TABLE IF NOT EXISTS attendance_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    division_id INTEGER,  -- NULL means applies to all divisions
    grace_period_start TIME DEFAULT '09:15:00',
    grace_period_end TIME DEFAULT '09:30:00',
    late_threshold_minutes INTEGER DEFAULT 15,  -- After grace period, how late is "late"?
    auto_absent_enabled BOOLEAN DEFAULT 1,  -- Auto-mark absent if not checked in
    auto_absent_time TIME DEFAULT '23:59:59',  -- When to auto-mark absent
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE
);

-- Attendance Summary View (for quick reports)
CREATE VIEW IF NOT EXISTS attendance_summary AS
SELECT 
    s.id AS student_id,
    s.roll_number,
    s.first_name || ' ' || s.last_name AS student_name,
    d.id AS division_id,
    d.name AS division_name,
    c.name AS class_name,
    COUNT(CASE WHEN da.status = 'present' THEN 1 END) AS present_days,
    COUNT(CASE WHEN da.status = 'late' THEN 1 END) AS late_days,
    COUNT(CASE WHEN da.status = 'absent' THEN 1 END) AS absent_days,
    COUNT(da.id) AS total_days,
    ROUND(
        (COUNT(CASE WHEN da.status = 'present' THEN 1 END) * 100.0) / 
        NULLIF(COUNT(da.id), 0), 
        2
    ) AS attendance_percentage
FROM students s
LEFT JOIN divisions d ON s.division_id = d.id
LEFT JOIN classes c ON d.class_id = c.id
LEFT JOIN daily_attendance da ON s.id = da.student_id
GROUP BY s.id, s.roll_number, s.first_name, s.last_name, d.id, d.name, c.name;

-- Attendance Leave Requests Table (optional - for justified absences)
CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER,  -- staff_id who approved/rejected
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES staff(id) ON DELETE SET NULL
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_daily_attendance_student ON daily_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_division ON daily_attendance(division_id);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON daily_attendance(date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_status ON daily_attendance(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Insert default attendance configuration
INSERT OR IGNORE INTO attendance_config (id, division_id, grace_period_start, grace_period_end) 
VALUES (1, NULL, '09:15:00', '09:30:00');

-- ========================================
-- ATTENDANCE CALCULATION LOGIC
-- ========================================
-- Status determination rules:
-- 1. Check-in <= 09:30:00 (grace_period_end) → PRESENT
-- 2. Check-in > 09:30:00 and <= 09:45:00 → LATE
-- 3. Check-in > 09:45:00 → ABSENT (or LATE with notes)
-- 4. No check-in by 23:59:59 → Auto-marked ABSENT
-- ========================================
