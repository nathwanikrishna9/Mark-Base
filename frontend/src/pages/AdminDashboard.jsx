/**
 * Complete Admin Dashboard with all management features
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Webcam from "react-webcam";
import { adminAPI } from "../services/api";
import AttendanceAnalytics from "./components/AttendanceAnalytics";
import ThemeToggle from "../components/ThemeToggle";
import Toast from "../components/Toast";
import "../styles/dashboard.css";
import AppShell from "../layout/AppShell";
function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSubTab, setActiveSubTab] = useState("students");
  const [toasts, setToasts] = useState([]);
  const webcamRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  // Data states
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [parents, setParents] = useState([]);

  const hasParentUsername = parents.some((parent) => parent.username);

  // Form states
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showDivisionForm, setShowDivisionForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", code: "" });
  const [classForm, setClassForm] = useState({ name: "", department_id: "" });
  const [divisionForm, setDivisionForm] = useState({ name: "", department_id: "", class_id: "" });
  const [studentForm, setStudentForm] = useState({
    username: "",
    password: "",
    roll_number: "",
    enrollment_number: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department_id: "",
    class_id: "",
    division_id: "",
    date_of_birth: "",
    enrollment_year: new Date().getFullYear(),
  });
  const [batches, setBatches] = useState([]);
  const [selectedStudentForFace, setSelectedStudentForFace] = useState(null);
  const [staffForm, setStaffForm] = useState({
    staff_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department_id: "",
    class_id: "",
    division_id: "",
    username: "",
    password: "",
  });
  const [showParentForm, setShowParentForm] = useState(false);

  // Edit states
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingParent, setEditingParent] = useState(null);

  // Attendance management states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceDepartment, setAttendanceDepartment] = useState("");
  const [attendanceClass, setAttendanceClass] = useState("");
  const [attendanceDivision, setAttendanceDivision] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [flashRowId, setFlashRowId] = useState(null);

  // Computed attendance summary
  const attendanceSummary = useMemo(() => ({
    present: attendanceRecords.filter(r => r.status === "present").length,
    late: attendanceRecords.filter(r => r.status === "late").length,
    absent: attendanceRecords.filter(r => r.status === "absent").length,
    unmarked: attendanceRecords.filter(r => r.status === "unmarked").length,
    total: attendanceRecords.length,
  }), [attendanceRecords]);

  // Filtered lists for cascading dropdowns
  const filteredClasses = useMemo(() => {
    if (!attendanceDepartment) return classes;
    return classes.filter(c => c.department_id === parseInt(attendanceDepartment));
  }, [classes, attendanceDepartment]);

  const filteredDivisions = useMemo(() => {
    if (!attendanceClass) return divisions;
    return divisions.filter(d => d.class_id === parseInt(attendanceClass));
  }, [divisions, attendanceClass]);

  const [parentForm, setParentForm] = useState({
    department_id: "",
    class_id: "",
    division_id: "",
    student_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    relation: "father",
    username: "",
    password: ""
  });
  const [selectedChildren, setSelectedChildren] = useState([]);

  // Helper to add a child to the selected list
  const handleAddChild = () => {
    if (!parentForm.student_id) return;
    const studentId = parseInt(parentForm.student_id);
    // Check if already added
    if (selectedChildren.some(c => c.id === studentId)) {
      showMessage("error", "This child is already added");
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const div = divisions.find(d => d.id === student.division_id);
    const cls = div ? classes.find(c => c.id === div.class_id) : null;
    const dept = cls ? departments.find(d => d.id === cls.department_id) : null;
    setSelectedChildren(prev => [...prev, {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      roll_number: student.roll_number,
      division: div?.name || 'N/A',
      class_name: cls?.name || '',
      department: dept?.name || ''
    }]);
    // Reset student selection (keep dept/class/div for adding more from same div)
    setParentForm(prev => ({ ...prev, student_id: "" }));
  };

  // Helper to remove a child from the selected list
  const handleRemoveChild = (studentId) => {
    setSelectedChildren(prev => prev.filter(c => c.id !== studentId));
  };
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsDays, setAnalyticsDays] = useState(30);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadAnalyticsEngine();
  }, [analyticsDays]);

  const loadAnalyticsEngine = async () => {
    try {
      const data = await adminAPI.getAnalytics(analyticsDays);
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  const loadAllData = async () => {
    try {
      const [depts, cls, divs, studs, stf, subjs, btchs, prnts] =
        await Promise.all([
          adminAPI.getDepartments(),
          adminAPI.getClasses(),
          adminAPI.getDivisions(),
          adminAPI.getStudents(),
          adminAPI.getStaff(),
          adminAPI.getSubjects(),
          adminAPI.getBatches(),
          adminAPI.getParents(),
        ]);
      setDepartments(depts);
      setClasses(cls);
      setDivisions(divs);
      setStudents(studs);
      setStaff(stf);
      setSubjects(subjs);
      setBatches(btchs);
      setParents(prnts);
    } catch (error) {
      showMessage("error", "Failed to load data");
    }
  };

  // Load attendance records when division and date are selected
  const loadAttendanceRecords = async () => {
    if (!attendanceDivision || !attendanceDate) return;
    setLoadingAttendance(true);
    try {
      const data = await adminAPI.getDivisionAttendance(attendanceDivision, attendanceDate);
      setAttendanceRecords(data.records || []);
    } catch (error) {
      showMessage("error", "Failed to load attendance records");
    } finally {
      setLoadingAttendance(false);
    }
  };

  // WebSocket setup for real-time updates
  useEffect(() => {
    let ws;
    if (activeTab === "attendance" && attendanceDivision && attendanceDate) {
      const sessionId = `${attendanceDivision}_${attendanceDate}`;
      ws = new WebSocket(`wss://mark-base-backend.railway.internal:8000/ws/attendance/${sessionId}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'ATTENDANCE_UPDATE') {
          setAttendanceRecords(prev => {
            const newRecords = [...prev];
            const index = newRecords.findIndex(r => r.student_id === data.student_id);
            if (index !== -1) {
              newRecords[index] = { ...newRecords[index], status: data.status, check_in_time: data.check_in_time, marked_method: data.marked_method };
              return newRecords;
            } else {
              loadAttendanceRecords();
              return prev;
            }
          });
        } else if (data.type === 'ATTENDANCE_BULK_UPDATE') {
          loadAttendanceRecords();
        }
      };

      ws.onerror = (error) => console.error("WebSocket error:", error);
    }
    return () => {
      if (ws) ws.close();
    };
  }, [activeTab, attendanceDivision, attendanceDate]);

  // Handle attendance status update — optimistic UI with rollback
  const handleUpdateAttendance = async (studentId, newStatus) => {
    const prevRecords = [...attendanceRecords];

    // Optimistic update
    setAttendanceRecords(records =>
      records.map(r =>
        r.student_id === studentId
          ? { ...r, status: newStatus, _saving: true }
          : r
      )
    );
    setSavingStudentId(studentId);

    try {
      await adminAPI.updateAttendance({
        student_id: studentId,
        date: attendanceDate,
        status: newStatus,
        admin_id: user?.id || null,
      });

      // Clear saving state + flash success
      setAttendanceRecords(records =>
        records.map(r =>
          r.student_id === studentId
            ? { ...r, _saving: false, marked_method: "admin_manual" }
            : r
        )
      );
      setFlashRowId(studentId);
      setTimeout(() => setFlashRowId(null), 700);
      showMessage("success", `Marked as ${newStatus}`);
    } catch (error) {
      // Rollback on failure
      setAttendanceRecords(prevRecords);
      showMessage("error", error.response?.data?.detail || "Failed to update attendance");
    } finally {
      setSavingStudentId(null);
    }
  };

  // Handle bulk attendance update
  const handleBulkUpdate = async (status, onlyUnmarked = false) => {
    const label = onlyUnmarked ? "remaining unmarked" : "ALL";
    if (!window.confirm(
      `Mark ${label} students as "${status}"? This will affect ${onlyUnmarked ? attendanceSummary.unmarked : attendanceSummary.total} student(s).`
    )) return;

    try {
      const result = await adminAPI.bulkUpdateAttendance({
        division_id: parseInt(attendanceDivision),
        date: attendanceDate,
        status,
        admin_id: user?.id || null,
        only_unmarked: onlyUnmarked,
      });
      showMessage("success", `Updated ${result.updated} record(s)${result.skipped ? `, ${result.skipped} skipped` : ""}`);
      loadAttendanceRecords(); // Full refresh after bulk action
    } catch (error) {
      showMessage("error", error.response?.data?.detail || "Bulk update failed");
    }
  };

  // Handle note save
  const handleSaveNote = async (studentId, currentStatus) => {
    setSavingNote(true);
    try {
      await adminAPI.updateAttendance({
        student_id: studentId,
        date: attendanceDate,
        status: currentStatus,
        admin_id: user?.id || null,
        notes: noteText,
      });
      // Update local state
      setAttendanceRecords(records =>
        records.map(r =>
          r.student_id === studentId ? { ...r, notes: noteText } : r
        )
      );
      showMessage("success", "Note saved");
      setEditingNoteId(null);
      setNoteText("");
    } catch (error) {
      showMessage("error", error.response?.data?.detail || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  // Staff edit handlers
  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setStaffForm({
      staff_id: staffMember.staff_id,
      first_name: staffMember.first_name,
      last_name: staffMember.last_name,
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      department_id: staffMember.department_id?.toString() || "",
      class_id: staffMember.class_id?.toString() || "",
      division_id: staffMember.division_id?.toString() || "",
      username: staffMember.username || "",
      password: "",
    });
    setShowStaffForm(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        staff_id: staffForm.staff_id,
        first_name: staffForm.first_name,
        last_name: staffForm.last_name,
        email: staffForm.email || null,
        phone: staffForm.phone || null,
        department_id: staffForm.department_id ? parseInt(staffForm.department_id) : null,
      };
      // Include credentials if provided
      if (staffForm.username && staffForm.username.trim()) {
        updateData.username = staffForm.username.trim();
      }
      if (staffForm.password && staffForm.password.trim()) {
        updateData.password = staffForm.password.trim();
      }
      await adminAPI.updateStaff(editingStaff.id, updateData);
      showMessage("success", "Staff updated successfully!");
      setShowStaffForm(false);
      setEditingStaff(null);
      setStaffForm({
        staff_id: "",
        first_name: "",
        last_name: "",
        email: "",
        department_id: "",
        username: "",
        password: "",
      });
      loadAllData();
    } catch (error) {
      showMessage("error", error.response?.data?.detail || "Failed to update staff");
    }
  };

  // Student edit handlers
  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setStudentForm({
      username: student.username || "",
      password: "",
      roll_number: student.roll_number,
      enrollment_number: student.enrollment_number || "",
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email || "",
      phone: student.phone || "",
      department_id: student.department_id?.toString() || "",
      class_id: student.class_id?.toString() || "",
      division_id: student.division_id?.toString() || "",
      date_of_birth: student.date_of_birth || "",
      enrollment_year: student.enrollment_year || new Date().getFullYear(),
    });
    setShowStudentForm(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        roll_number: studentForm.roll_number,
        enrollment_number: studentForm.enrollment_number || null,
        first_name: studentForm.first_name,
        last_name: studentForm.last_name,
        email: studentForm.email || null,
        phone: studentForm.phone || null,
        date_of_birth: studentForm.date_of_birth || null,
        enrollment_year: studentForm.enrollment_year ? parseInt(studentForm.enrollment_year) : null,
      };
      if (studentForm.division_id) {
        updateData.division_id = parseInt(studentForm.division_id);
      }
      // Include credentials if provided
      if (studentForm.username && studentForm.username.trim()) {
        updateData.username = studentForm.username.trim();
      }
      if (studentForm.password && studentForm.password.trim()) {
        updateData.password = studentForm.password.trim();
      }
      await adminAPI.updateStudent(editingStudent.id, updateData);
      showMessage("success", "Student updated successfully!");
      setShowStudentForm(false);
      setEditingStudent(null);
      setStudentForm({
        username: "",
        password: "",
        roll_number: "",
        enrollment_number: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        department_id: "",
        class_id: "",
        division_id: "",
        date_of_birth: "",
        enrollment_year: new Date().getFullYear(),
      });
      loadAllData();
    } catch (error) {
      showMessage("error", error.response?.data?.detail || "Failed to update student");
    }
  };

  // Parent edit handlers
  const handleEditParent = (parent) => {
    setEditingParent(parent);
    setParentForm({
      student_id: parent.student_id?.toString() || "",
      first_name: parent.first_name,
      last_name: parent.last_name,
      email: parent.email || "",
      phone: parent.phone || "",
      relation: parent.relation,
      username: parent.username || "",
      password: ""
    });
    setShowParentForm(true);
  };

  const handleUpdateParent = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        first_name: parentForm.first_name,
        last_name: parentForm.last_name,
        email: parentForm.email || null,
        phone: parentForm.phone || null,
        relation: parentForm.relation,
      };
      // Include credentials if provided
      if (parentForm.username && parentForm.username.trim()) {
        updateData.username = parentForm.username.trim();
      }
      if (parentForm.password && parentForm.password.trim()) {
        updateData.password = parentForm.password.trim();
      }
      await adminAPI.updateParent(editingParent.id, updateData);
      showMessage("success", "Parent updated successfully!");
      setShowParentForm(false);
      setEditingParent(null);
      setParentForm({
        student_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        relation: "father",
        username: "",
        password: ""
      });
      loadAllData();
    } catch (error) {
      showMessage("error", error.response?.data?.detail || "Failed to update parent");
    }
  };
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showMessage = useCallback((type, text) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, text }]);
  }, []);
  // Department handlers
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createDepartment(deptForm);
      showMessage("success", "Department created successfully!");
      setShowDeptForm(false);
      setDeptForm({ name: "", code: "" });
      loadAllData();
    } catch (error) {
      console.error("Department creation error:", error);
      const errorMsg =
        error.response?.data?.detail ||
        error.message ||
        "Failed to create department";
      showMessage("error", errorMsg);
    }
  };
  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: classForm.name.trim(),
        department_id: parseInt(classForm.department_id),
      };
      await adminAPI.createClass(payload);
      showMessage("success", "Class created successfully!");
      setShowClassForm(false);
      setClassForm({ name: "", department_id: "" });
      loadAllData();
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail ||
        error.message ||
        "Failed to create class";
      showMessage("error", errorMsg);
    }
  };
  const handleCreateDivision = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: divisionForm.name.trim(),
        class_id: parseInt(divisionForm.class_id),
      };
      await adminAPI.createDivision(payload);
      showMessage("success", "Division created successfully!");
      setShowDivisionForm(false);
      setDivisionForm({ name: "", department_id: "", class_id: "" });
      loadAllData();
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail ||
        error.message ||
        "Failed to create division";
      showMessage("error", errorMsg);
    }
  };
  // Camera handlers
  const handleCaptureFace = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setShowCamera(false);
  };
  const handleRetakeFace = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };
  // Student handlers
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (
        !studentForm.department_id ||
        !studentForm.class_id ||
        !studentForm.division_id
      ) {
        showMessage("error", "Please select Department, Class, and Division");
        return;
      }
      // Create student first (without face)
      const studentData = {
        username: studentForm.username,
        password: studentForm.password,
        roll_number: studentForm.roll_number,
        enrollment_number: studentForm.enrollment_number,
        first_name: studentForm.first_name,
        last_name: studentForm.last_name,
        email: studentForm.email,
        phone: studentForm.phone,
        department_id: parseInt(studentForm.department_id),
        class_id: parseInt(studentForm.class_id),
        division_id: parseInt(studentForm.division_id),
        date_of_birth: studentForm.date_of_birth,
        enrollment_year: parseInt(studentForm.enrollment_year),
      };
      const newStudent = await adminAPI.createStudent(studentData);
      // If face is captured, register it
      if (capturedImage) {
        try {
          const blob = await fetch(capturedImage).then((r) => r.blob());
          const file = new File([blob], "face.jpg", { type: "image/jpeg" });
          await adminAPI.registerStudentFace(newStudent.id, file);
          showMessage("success", "Student created with face registration!");
        } catch (faceError) {
          // Student was created but face registration failed — show specific error
          showMessage(
            "warning",
            `Student created, but face registration failed: ${
              faceError.response?.data?.detail || faceError.message || "Unknown error"
            }. You can register the face later from the student list.`
          );
        }
      } else {
        showMessage("success", "Student created! Register face later.");
      }
      setShowStudentForm(false);
      setCapturedImage(null);
      setShowCamera(false);
      setStudentForm({
        username: "",
        roll_number: "",
        enrollment_number: "",
        first_name: "",
        last_name: "",
        email: "",
        department_id: "",
        class_id: "",
        division_id: "",
        date_of_birth: "",
        enrollment_year: new Date().getFullYear(),
      });
      loadAllData();
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.detail || "Failed to create student",
      );
    }
  };

  const handleRegisterFace = async (studentId) => {
    if (!capturedImage) {
      showMessage("error", "Please capture a face first");
      return;
    }
    try {
      const blob = await fetch(capturedImage).then((r) => r.blob());
      const file = new File([blob], "face.jpg", { type: "image/jpeg" });
      await adminAPI.registerStudentFace(studentId, file);
      showMessage("success", "Face registered successfully!");
      setSelectedStudentForFace(null);
      setCapturedImage(null);
      setShowCamera(false);
      loadAllData();
    } catch (error) {
      showMessage("error", error.response?.data?.detail || error.message || "Failed to register face");
    }
  };
  return (
    <AppShell
      title="Admin"
      subtitle={`System Management Portal · ${user.username}`}
      navItems={[
        { value: "overview", label: "Overview" },
        { value: "structure", label: "Academic Structure" },
        { value: "users", label: "Users" },
        { value: "attendance", label: "Attendance" },
      ]}
      navValue={activeTab}
      onNavChange={(next) => {
        setActiveTab(next);
        if (next === "structure") setActiveSubTab("departments");
        if (next === "users") setActiveSubTab("students");
      }}
      actions={
        <>
          <ThemeToggle />
          <button className="btn btn-danger" onClick={onLogout}>
            Logout
          </button>
        </>
      }
    >
        <Toast toasts={toasts} onRemove={removeToast} />
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{departments.length}</h3>
                <p>Departments</p>
              </div>
              <div className="stat-card">
                <h3>{students.length}</h3>
                <p>Students</p>
              </div>
              <div className="stat-card">
                <h3>{staff.length}</h3>
                <p>Staff</p>
              </div>
              <div className="stat-card">
                <h3>{divisions.length}</h3>
                <p>Divisions</p>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '10px 0' }} />

            <h2 style={{ marginBottom: "0px", marginTop: "10px", fontSize: "24px" }}>Organization Attendance Analytics</h2>
            <AttendanceAnalytics
              data={analyticsData}
              departments={departments.map(d => d.name)}
              dateRange={analyticsDays}
              onDateRangeChange={(days) => setAnalyticsDays(days)}
            />
          </div>
        )}
        {/* STRUCTURE TAB */}
        {activeTab === "structure" && (
          <div>
            <div className="subtabs">
              <button
                className={activeSubTab === "departments" ? "active" : ""}
                onClick={() => setActiveSubTab("departments")}
              >
                Departments
              </button>
              <button
                className={activeSubTab === "classes" ? "active" : ""}
                onClick={() => setActiveSubTab("classes")}
              >
                Classes
              </button>
              <button
                className={activeSubTab === "divisions" ? "active" : ""}
                onClick={() => setActiveSubTab("divisions")}
              >
                Divisions
              </button>
            </div>
            {activeSubTab === "departments" && (
              <div className="card">
                <div className="card-header">
                  <h3>Departments</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowDeptForm(!showDeptForm)}
                  >
                    + Add Department
                  </button>
                </div>
                {showDeptForm && (
                  <form onSubmit={handleCreateDepartment} className="form-box">
                    <div className="form-group">
                      <label>Department Name</label>
                      <input
                        type="text"
                        required
                        value={deptForm.name}
                        onChange={(e) =>
                          setDeptForm({ ...deptForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Department Code</label>
                      <input
                        type="text"
                        required
                        value={deptForm.code}
                        onChange={(e) =>
                          setDeptForm({ ...deptForm, code: e.target.value })
                        }
                      />
                    </div>
                    <button type="submit" className="btn btn-success">
                      Create
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowDeptForm(false)}
                    >
                      Cancel
                    </button>
                  </form>
                )}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => (
                      <tr key={dept.id}>
                        <td>{dept.id}</td>
                        <td>{dept.name}</td>
                        <td>{dept.code}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={async () => {
                              if (
                                window.confirm(
                                  `Delete department "${dept.name}"? This cannot be undone.`,
                                )
                              ) {
                                try {
                                  await adminAPI.deleteDepartment(dept.id);
                                  showMessage(
                                    "success",
                                    "Department deleted successfully!",
                                  );
                                  loadAllData();
                                } catch (error) {
                                  const errorMsg =
                                    error.response?.data?.detail ||
                                    "Failed to delete department";
                                  showMessage("error", errorMsg);
                                }
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeSubTab === "classes" && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>Classes</h3>
                    <p className="text-muted">
                      Total classes: {classes.length}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowClassForm(!showClassForm)}
                  >
                    + Add Class
                  </button>
                </div>
                {showClassForm && (
                  <form onSubmit={handleCreateClass} className="form-box">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Class Name *</label>
                        <input
                          type="text"
                          required
                          value={classForm.name}
                          onChange={(e) =>
                            setClassForm({ ...classForm, name: e.target.value })
                          }
                          placeholder="1K"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Department *</label>
                        <select
                          required
                          value={classForm.department_id}
                          onChange={(e) =>
                            setClassForm({
                              ...classForm,
                              department_id: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        Create Class
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowClassForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Class</th>
                      <th>Department</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-muted">
                          No classes yet. Add one above.
                        </td>
                      </tr>
                    ) : (
                      classes.map((cls) => {
                        const dept = departments.find(
                          (item) => item.id === cls.department_id,
                        );
                        return (
                          <tr key={cls.id}>
                            <td>{cls.id}</td>
                            <td>{cls.name}</td>
                            <td>
                              {dept
                                ? `${dept.name} (${dept.code})`
                                : `Department ${cls.department_id}`}
                            </td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `Delete class "${cls.name}"? This will also remove linked divisions and subjects.`,
                                    )
                                  ) {
                                    try {
                                      await adminAPI.deleteClass(cls.id);
                                      showMessage(
                                        "success",
                                        "Class deleted successfully!",
                                      );
                                      loadAllData();
                                    } catch (error) {
                                      const errorMsg =
                                        error.response?.data?.detail ||
                                        "Failed to delete class";
                                      showMessage("error", errorMsg);
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {activeSubTab === "divisions" && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>Divisions</h3>
                    <p className="text-muted">
                      Total divisions: {divisions.length}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowDivisionForm(!showDivisionForm)}
                  >
                    + Add Division
                  </button>
                </div>
                {showDivisionForm && (
                  <form onSubmit={handleCreateDivision} className="form-box">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Division Name *</label>
                        <input
                          type="text"
                          required
                          value={divisionForm.name}
                          onChange={(e) =>
                            setDivisionForm({
                              ...divisionForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="A"
                        />
                      </div>
                      <div className="form-group">
                        <label>Department *</label>
                        <select
                          required
                          value={divisionForm.department_id}
                          onChange={(e) =>
                            setDivisionForm({
                              ...divisionForm,
                              department_id: e.target.value,
                              class_id: "", // Reset class when department changes
                            })
                          }
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Class *</label>
                        <select
                          required
                          value={divisionForm.class_id}
                          onChange={(e) =>
                            setDivisionForm({
                              ...divisionForm,
                              class_id: e.target.value,
                            })
                          }
                          disabled={!divisionForm.department_id}
                        >
                          <option value="">Select Class</option>
                          {classes
                            .filter((cls) => cls.department_id === parseInt(divisionForm.department_id))
                            .map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        Create Division
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowDivisionForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Division</th>
                      <th>Class</th>
                      <th>Department</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-muted">
                          No divisions yet. Add one above.
                        </td>
                      </tr>
                    ) : (
                      divisions.map((division) => {
                        const cls = classes.find(
                          (item) => item.id === division.class_id,
                        );
                        const dept = cls
                          ? departments.find(
                            (item) => item.id === cls.department_id,
                          )
                          : null;
                        const departmentLabel = dept
                          ? `${dept.name} (${dept.code})`
                          : cls
                            ? `Department ${cls.department_id}`
                            : "—";
                        return (
                          <tr key={division.id}>
                            <td>{division.id}</td>
                            <td>{division.name}</td>
                            <td>
                              {cls ? cls.name : `Class ${division.class_id}`}
                            </td>
                            <td>{departmentLabel}</td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `Delete division "${division.name}"? This will remove linked batches and students.`,
                                    )
                                  ) {
                                    try {
                                      await adminAPI.deleteDivision(
                                        division.id,
                                      );
                                      showMessage(
                                        "success",
                                        "Division deleted successfully!",
                                      );
                                      loadAllData();
                                    } catch (error) {
                                      const errorMsg =
                                        error.response?.data?.detail ||
                                        "Failed to delete division";
                                      showMessage("error", errorMsg);
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* USERS TAB */}
        {activeTab === "users" && (
          <div>
            <div className="subtabs">
              <button
                className={activeSubTab === "students" ? "active" : ""}
                onClick={() => setActiveSubTab("students")}
              >
                Students
              </button>
              <button
                className={activeSubTab === "staff" ? "active" : ""}
                onClick={() => setActiveSubTab("staff")}
              >
                Staff
              </button>
              <button
                className={activeSubTab === "parents" ? "active" : ""}
                onClick={() => setActiveSubTab("parents")}
              >
                Parents
              </button>
            </div>
            {/* STUDENTS */}
            {activeSubTab === "students" && (
              <div className="card">
                <div className="card-header">
                  <h3>Students Management</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (editingStudent || !showStudentForm) {
                        setEditingStudent(null);
                        setStudentForm({
                          username: "",
                          password: "",
                          roll_number: "",
                          enrollment_number: "",
                          first_name: "",
                          last_name: "",
                          email: "",
                          phone: "",
                          department_id: "",
                          class_id: "",
                          division_id: "",
                          date_of_birth: "",
                          enrollment_year: new Date().getFullYear(),
                        });
                        setShowStudentForm(true);
                      } else {
                        setShowStudentForm(false);
                      }
                    }}
                  >
                    + Add Student
                  </button>
                </div>
                {showStudentForm && (
                  <form onSubmit={editingStudent ? handleUpdateStudent : handleCreateStudent} className="form-box">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Roll Number *</label>
                        <input
                          type="text"
                          required
                          value={studentForm.roll_number}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              roll_number: e.target.value,
                            })
                          }
                          placeholder="2026001"
                        />
                      </div>
                      <div className="form-group">
                        <label>Enrollment Number *</label>
                        <input
                          type="text"
                          required
                          value={studentForm.enrollment_number}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              enrollment_number: e.target.value,
                            })
                          }
                          placeholder="EN2026001"
                        />
                      </div>
                      <div className="form-group">
                        <label>{editingStudent ? 'New Username' : 'Username *'}</label>
                        <input
                          type="text"
                          required={!editingStudent}
                          value={studentForm.username}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              username: e.target.value,
                            })
                          }
                          placeholder={editingStudent ? 'Username' : 'john.doe'}
                        />
                      </div>
                      <div className="form-group">
                        <label>{editingStudent ? 'New Password' : 'Password *'}</label>
                        <input
                          type="password"
                          required={!editingStudent}
                          value={studentForm.password}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              password: e.target.value,
                            })
                          }
                          placeholder={editingStudent ? 'Password' : 'Enter password'}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          required
                          value={studentForm.first_name}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              first_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          required
                          value={studentForm.last_name}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              last_name: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          required
                          value={studentForm.email}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Date of Birth *</label>
                        <input
                          type="date"
                          required
                          max={new Date().toISOString().split('T')[0]}
                          value={studentForm.date_of_birth}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              date_of_birth: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Department *</label>
                        <select
                          required
                          value={studentForm.department_id}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              department_id: e.target.value,
                              class_id: "",
                              division_id: "",
                            })
                          }
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Class *</label>
                        <select
                          required
                          value={studentForm.class_id}
                          disabled={!studentForm.department_id}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              class_id: e.target.value,
                              division_id: "",
                            })
                          }
                        >
                          <option value="">Select Class</option>
                          {classes
                            .filter(
                              (c) =>
                                c.department_id ===
                                parseInt(studentForm.department_id),
                            )
                            .map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                        </select>

                      </div>
                      <div className="form-group">
                        <label>Division *</label>
                        <select
                          required
                          value={studentForm.division_id}
                          disabled={!studentForm.class_id}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              division_id: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Division</option>
                          {divisions
                            .filter(
                              (d) =>
                                d.class_id === parseInt(studentForm.class_id),
                            )
                            .map((div) => (
                              <option key={div.id} value={div.id}>
                                Division {div.name}
                              </option>
                            ))}
                        </select>

                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Enrollment Year *</label>
                        <input
                          type="number"
                          required
                          value={studentForm.enrollment_year}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              enrollment_year: e.target.value,
                            })
                          }
                          placeholder="2026"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Face Photo (for AI Recognition)</label>
                      {!showCamera && !capturedImage && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setShowCamera(true)}
                        >
                          Open Camera to Capture Face
                        </button>
                      )}
                      {showCamera && (
                        <div className="camera-capture">
                          <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{
                              width: 640,
                              height: 480,
                              facingMode: "user",
                            }}
                            className="webcam-preview"
                          />
                          <div className="camera-actions">
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={handleCaptureFace}
                            >
                              Capture Face
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setShowCamera(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {capturedImage && (
                        <div className="captured-image">
                          <img
                            src={capturedImage}
                            alt="Captured face"
                            style={{ maxWidth: "300px", borderRadius: "8px" }}
                          />
                          <div className="camera-actions">
                            <button
                              type="button"
                              className="btn btn-warning"
                              onClick={handleRetakeFace}
                            >
                              Retake Photo
                            </button>
                            <span className="text-success">
                              Face captured successfully
                            </span>
                          </div>
                        </div>
                      )}
                      <small className="text-muted">
                        Capture a clear photo of the student's face for AI
                        attendance recognition
                      </small>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        {editingStudent ? "Update Student" : "Create Student"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowStudentForm(false);
                          setEditingStudent(null);
                          setStudentForm({
                            username: "",
                            roll_number: "",
                            enrollment_number: "",
                            first_name: "",
                            last_name: "",
                            email: "",
                            phone: "",
                            department_id: "",
                            class_id: "",
                            division_id: "",
                            date_of_birth: "",
                            enrollment_year: new Date().getFullYear(),
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Division</th>
                      <th>Face Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const division = divisions.find(
                        (d) => d.id === student.division_id,
                      );
                      const cls = classes.find(
                        (c) => c.id === division?.class_id,
                      );
                      return (
                        <tr key={student.id}>
                          <td>{student.roll_number}</td>
                          <td>
                            {student.first_name} {student.last_name}
                          </td>
                          <td>{student.email}</td>
                          <td>
                            {division
                              ? `${cls?.name || ""} ${division.name}`
                              : student.division_id}
                          </td>
                          <td>{student.face_registered ? "Yes" : "No"}</td>
                          <td>
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => handleEditStudent(student)}
                              style={{ marginRight: '8px' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Delete student "${student.first_name} ${student.last_name}"? This will also remove their user account and all attendance records.`,
                                  )
                                ) {
                                  try {
                                    await adminAPI.deleteStudent(student.id);
                                    showMessage(
                                      "success",
                                      "Student deleted successfully!",
                                    );
                                    loadAllData();
                                  } catch (error) {
                                    const errorMsg =
                                      error.response?.data?.detail ||
                                      "Failed to delete student";
                                    showMessage("error", errorMsg);
                                  }
                                }
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* STAFF */}
            {activeSubTab === "staff" && (
              <div className="card">
                <div className="card-header">
                  <h3>Staff Management</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (editingStaff || !showStaffForm) {
                        setEditingStaff(null);
                        setStaffForm({
                          staff_id: "",
                          first_name: "",
                          last_name: "",
                          email: "",
                          phone: "",
                          department_id: "",
                          class_id: "",
                          division_id: "",
                          username: "",
                          password: "",
                        });
                        setShowStaffForm(true);
                      } else {
                        setShowStaffForm(false);
                      }
                    }}
                  >
                    + Add Staff
                  </button>
                </div>
                {showStaffForm && (
                  <form
                    onSubmit={editingStaff ? handleUpdateStaff : async (e) => {
                      e.preventDefault();
                      try {
                        await adminAPI.createStaff({
                          ...staffForm,
                          department_id: parseInt(staffForm.department_id),
                          phone: staffForm.phone || null,
                        });
                        showMessage("success", "Staff created successfully!");
                        setShowStaffForm(false);
                        setStaffForm({
                          staff_id: "",
                          first_name: "",
                          last_name: "",
                          email: "",
                          department_id: "",
                          username: "",
                          password: "",
                        });
                        loadAllData();
                      } catch (error) {
                        console.error("Staff creation error:", error);
                        showMessage(
                          "error",
                          error.response?.data?.detail ||
                          "Failed to create staff",
                        );
                      }
                    }}
                    className="form-box"
                  >
                    <div className="form-row">
                      <div className="form-group">
                        <label>Staff ID *</label>
                        <input
                          type="text"
                          required
                          value={staffForm.staff_id}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              staff_id: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          required
                          value={staffForm.first_name}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              first_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          required
                          value={staffForm.last_name}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              last_name: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          required
                          value={staffForm.email}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Department *</label>
                        <select
                          required
                          value={staffForm.department_id}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              department_id: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{editingStaff ? 'New Username (leave blank to keep)' : 'Username *'}</label>
                        <input
                          type="text"
                          required={!editingStaff}
                          value={staffForm.username}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              username: e.target.value,
                            })
                          }
                          placeholder={editingStaff ? 'Leave blank to keep current' : 'staff.username'}
                        />
                      </div>
                      <div className="form-group">
                        <label>{editingStaff ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                        <input
                          type="password"
                          required={!editingStaff}
                          value={staffForm.password}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              password: e.target.value,
                            })
                          }
                          placeholder={editingStaff ? 'Leave blank to keep current' : 'Enter password'}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        {editingStaff ? "Update Staff" : "Create Staff"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowStaffForm(false);
                          setEditingStaff(null);
                          setStaffForm({
                            staff_id: "",
                            first_name: "",
                            last_name: "",
                            email: "",
                            department_id: "",
                            username: "",
                            password: "",
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Staff ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s) => {
                      const dept = departments.find(
                        (d) => d.id === s.department_id,
                      );
                      return (
                        <tr key={s.id}>
                          <td>{s.staff_id}</td>
                          <td>
                            {s.first_name} {s.last_name}
                          </td>
                          <td>{s.email}</td>
                          <td>
                            {dept
                              ? `${dept.name} (${dept.code})`
                              : s.department_id}
                          </td>
                          <td>
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => handleEditStaff(s)}
                              style={{ marginRight: '8px' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Delete staff "${s.first_name} ${s.last_name}"? This will also remove their user account.`,
                                  )
                                ) {
                                  try {
                                    await adminAPI.deleteStaff(s.id);
                                    showMessage(
                                      "success",
                                      "Staff deleted successfully!",
                                    );
                                    loadAllData();
                                  } catch (error) {
                                    const errorMsg =
                                      error.response?.data?.detail ||
                                      "Failed to delete staff";
                                    showMessage("error", errorMsg);
                                  }
                                }
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* PARENTS */}
            {activeSubTab === "parents" && (
              <div className="card">
                <div className="card-header">
                  <h3>Parents Management</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (editingParent || !showParentForm) {
                        setEditingParent(null);
                        setSelectedChildren([]);
                        setParentForm({
                          department_id: "",
                          class_id: "",
                          division_id: "",
                          student_id: "",
                          first_name: "",
                          last_name: "",
                          email: "",
                          phone: "",
                          relation: "father",
                          username: "",
                          password: ""
                        });
                        setShowParentForm(true);
                      } else {
                        setShowParentForm(false);
                      }
                    }}
                  >
                    + Add Parent
                  </button>
                </div>
                {showParentForm && (
                  <form
                    onSubmit={editingParent ? handleUpdateParent : async (e) => {
                      e.preventDefault();
                      try {
                        const payload = {
                          username: parentForm.username,
                          password: parentForm.password,
                          first_name: parentForm.first_name,
                          last_name: parentForm.last_name,
                          email: parentForm.email || null,
                          phone: parentForm.phone,
                          relation: parentForm.relation,
                          student_ids: selectedChildren.map(c => c.id)
                        };
                        if (payload.student_ids.length === 0) {
                          showMessage("error", "Please add at least one child");
                          return;
                        }
                        await adminAPI.createParent(payload);
                        showMessage("success", `Parent account created with ${payload.student_ids.length} child(ren)!`);
                        setShowParentForm(false);
                        setSelectedChildren([]);
                        setParentForm({
                          department_id: "",
                          class_id: "",
                          division_id: "",
                          student_id: "",
                          first_name: "",
                          last_name: "",
                          email: "",
                          phone: "",
                          relation: "father",
                          username: "",
                          password: "",
                        });
                        loadAllData();
                      } catch (error) {
                        showMessage(
                          "error",
                          error.response?.data?.detail ||
                          "Failed to create parent",
                        );
                      }
                    }}
                    className="form-box"
                  >
                    <div className="alert alert-info">
                      Parent accounts can be linked to <strong>multiple children</strong> (students).
                      Add one or more children below. The parent will be able to switch between children on their dashboard.
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{(!editingParent && selectedChildren.length === 0) ? "Department *" : "Department (Optional)"}</label>
                        <select
                          required={!editingParent && selectedChildren.length === 0}
                          value={parentForm.department_id}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              department_id: e.target.value,
                              class_id: "",
                              division_id: "",
                              student_id: "",
                            })
                          }
                          disabled={departments.length === 0}
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </select>
                        {departments.length === 0 && <small className="text-muted text-warning">Loading departments...</small>}
                      </div>
                      <div className="form-group">
                        <label>{(!editingParent && selectedChildren.length === 0) ? "Class *" : "Class (Optional)"}</label>
                        <select
                          required={!editingParent && selectedChildren.length === 0}
                          value={parentForm.class_id}
                          disabled={!parentForm.department_id || classes.length === 0}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              class_id: e.target.value,
                              division_id: "",
                              student_id: "",
                            })
                          }
                        >
                          <option value="">Select Class</option>
                          {classes
                            .filter(
                              (c) =>
                                c.department_id === parseInt(parentForm.department_id),
                            )
                            .map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                        </select>
                        {parentForm.department_id && classes.length === 0 && <small className="text-muted text-warning">Loading classes...</small>}
                      </div>
                      <div className="form-group">
                        <label>{(!editingParent && selectedChildren.length === 0) ? "Division *" : "Division (Optional)"}</label>
                        <select
                          required={!editingParent && selectedChildren.length === 0}
                          value={parentForm.division_id}
                          disabled={!parentForm.class_id || divisions.length === 0}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              division_id: e.target.value,
                              student_id: "",
                            })
                          }
                        >
                          <option value="">Select Division</option>
                          {divisions
                            .filter(
                              (d) =>
                                d.class_id === parseInt(parentForm.class_id),
                            )
                            .map((div) => (
                              <option key={div.id} value={div.id}>
                                Division {div.name}
                              </option>
                            ))}
                        </select>
                        {parentForm.class_id && divisions.length === 0 && <small className="text-muted text-warning">Loading divisions...</small>}
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Select Student (Child)</label>
                        <select
                          value={parentForm.student_id}
                          disabled={!parentForm.division_id || students.length === 0}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              student_id: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Student</option>
                          {students
                            .filter((s) => s.division_id === parseInt(parentForm.division_id))
                            .filter((s) => !selectedChildren.some(c => c.id === s.id))
                            .map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.roll_number} - {student.first_name}{" "}
                                {student.last_name}
                              </option>
                            ))}
                        </select>
                        <small className="text-muted">
                          {!parentForm.division_id ? "Select a division first to load students" : "Select a student and click 'Add Child' button"}
                        </small>
                      </div>
                      <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleAddChild}
                          disabled={!parentForm.student_id}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          + Add Child
                        </button>
                      </div>
                      <div className="form-group">
                        <label>Relation *</label>
                        <select
                          required
                          value={parentForm.relation}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              relation: e.target.value,
                            })
                          }
                        >
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="guardian">Guardian</option>
                        </select>
                      </div>
                    </div>
                    {/* Selected Children Display */}
                    {!editingParent && selectedChildren.length > 0 && (
                      <div style={{
                        margin: '12px 0',
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.10) 0%, rgba(124, 58, 237, 0.10) 100%)',
                        borderRadius: '8px',
                        border: '1px solid rgba(124, 58, 237, 0.25)'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                          Children Added ({selectedChildren.length}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {selectedChildren.map((child) => (
                            <div
                              key={child.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: '#fff',
                                borderRadius: '20px',
                                border: '1px solid #ccc',
                                fontSize: '13px'
                              }}
                            >
                              <span style={{ fontWeight: '600' }}>{child.name}</span>
                              <span style={{ color: '#888', fontSize: '11px' }}>
                                {child.roll_number}
                                {child.department && ` • ${child.department}`}
                                {child.class_name && ` / ${child.class_name}`}
                                {child.division && ` — Div ${child.division}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveChild(child.id)}
                                style={{
                                  background: '#ff4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <small style={{ color: '#888', display: 'block', marginTop: '6px' }}>
                          💡 To add children from different departments, change the Department/Class/Division selectors above and add more.
                        </small>
                      </div>
                    )}
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          required
                          value={parentForm.first_name}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              first_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          required
                          value={parentForm.last_name}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              last_name: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={parentForm.email}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone *</label>
                        <input
                          type="tel"
                          required
                          value={parentForm.phone}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{editingParent ? 'New Username (leave blank to keep)' : 'Username *'}</label>
                        <input
                          type="text"
                          required={!editingParent}
                          value={parentForm.username}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              username: e.target.value,
                            })
                          }
                          placeholder={editingParent ? 'Leave blank to keep current' : 'parent.name'}
                        />
                      </div>
                      <div className="form-group">
                        <label>{editingParent ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                        <input
                          type="password"
                          required={!editingParent}
                          value={parentForm.password}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              password: e.target.value,
                            })
                          }
                          placeholder={editingParent ? 'Leave blank to keep current' : 'Enter password'}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        {editingParent ? "Update Parent" : "Create Parent Account"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowParentForm(false);
                          setEditingParent(null);
                          setSelectedChildren([]);
                          setParentForm({
                            department_id: "",
                            class_id: "",
                            division_id: "",
                            student_id: "",
                            first_name: "",
                            last_name: "",
                            email: "",
                            phone: "",
                            relation: "father",
                            username: "",
                            password: "",
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Parent Name</th>
                      <th>Relation</th>
                      <th>Phone</th>
                      <th>Children (Wards)</th>
                      {hasParentUsername && <th>Username</th>}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={hasParentUsername ? 6 : 5}
                          className="text-muted"
                        >
                          No parent accounts yet. Create one above.
                        </td>
                      </tr>
                    ) : (
                      parents.map((parent) => {
                        return (
                          <tr key={parent.id}>
                            <td>
                              {parent.first_name} {parent.last_name}
                            </td>
                            <td>{parent.relation}</td>
                            <td>{parent.phone}</td>
                            <td>
                              {parent.children && parent.children.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {parent.children.map((child, idx) => (
                                    <span key={child.student_id} style={{ fontSize: '13px' }}>
                                      {child.roll_number} — {child.name}
                                      {child.division && <span style={{ color: '#888', fontSize: '11px' }}> (Div {child.division})</span>}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">No children linked</span>
                              )}
                            </td>
                            {hasParentUsername && (
                              <td>{parent.username || "-"}</td>
                            )}
                            <td>
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => handleEditParent(parent)}
                                style={{ marginRight: '8px' }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `Delete parent account for "${parent.first_name} ${parent.last_name}"?`,
                                    )
                                  ) {
                                    try {
                                      await adminAPI.deleteParent(parent.id);
                                      showMessage(
                                        "success",
                                        "Parent account deleted successfully!",
                                      );
                                      loadAllData();
                                    } catch (error) {
                                      showMessage(
                                        "error",
                                        "Failed to delete parent",
                                      );
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Attendance Management</h3>
                <p className="text-muted" style={{ margin: 0, marginTop: '4px' }}>
                  Select a division and date to view/edit student attendance. Mark as Present, Late, or Absent.
                </p>
              </div>
            </div>

            {/* Cascading Filters */}
            <div className="form-box attendance-filters">
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={attendanceDepartment}
                    onChange={(e) => {
                      setAttendanceDepartment(e.target.value);
                      setAttendanceClass("");
                      setAttendanceDivision("");
                      setAttendanceRecords([]);
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Class</label>
                  <select
                    value={attendanceClass}
                    onChange={(e) => {
                      setAttendanceClass(e.target.value);
                      setAttendanceDivision("");
                      setAttendanceRecords([]);
                    }}
                  >
                    <option value="">All Classes</option>
                    {filteredClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Division *</label>
                  <select
                    value={attendanceDivision}
                    onChange={(e) => {
                      setAttendanceDivision(e.target.value);
                      setAttendanceRecords([]);
                    }}
                  >
                    <option value="">Select Division</option>
                    {filteredDivisions.map((d) => {
                      const cls = classes.find((c) => c.id === d.class_id);
                      return (
                        <option key={d.id} value={d.id}>
                          {cls?.name || ""} - {d.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    className="btn btn-primary"
                    onClick={loadAttendanceRecords}
                    disabled={!attendanceDivision || !attendanceDate || loadingAttendance}
                  >
                    {loadingAttendance ? "Loading..." : "Load Attendance"}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Bar */}
            {attendanceRecords.length > 0 && (
              <div className="attendance-summary-bar">
                <div className="summary-stats">
                  <div className="summary-item">
                    <span className="summary-dot present"></span>
                    <span>Present: <strong>{attendanceSummary.present}</strong></span>
                  </div>
                  <div className="summary-divider"></div>
                  <div className="summary-item">
                    <span className="summary-dot late"></span>
                    <span>Late: <strong>{attendanceSummary.late}</strong></span>
                  </div>
                  <div className="summary-divider"></div>
                  <div className="summary-item">
                    <span className="summary-dot absent"></span>
                    <span>Absent: <strong>{attendanceSummary.absent}</strong></span>
                  </div>
                  <div className="summary-divider"></div>
                  <div className="summary-item">
                    <span className="summary-dot unmarked"></span>
                    <span>Unmarked: <strong>{attendanceSummary.unmarked}</strong></span>
                  </div>
                  <div className="summary-divider"></div>
                  <div className="summary-item">
                    <span>Total: <strong>{attendanceSummary.total}</strong></span>
                  </div>
                </div>
                <div className="bulk-actions">
                  <button
                    className="btn btn-success"
                    onClick={() => handleBulkUpdate("present")}
                    title="Mark ALL students as Present"
                  >
                    ✓ Mark All Present
                  </button>
                  {attendanceSummary.unmarked > 0 && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleBulkUpdate("absent", true)}
                      title="Only mark students without a record as Absent"
                    >
                      ✗ Mark Remaining Absent
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Student Attendance Table */}
            {attendanceRecords.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <React.Fragment key={record.student_id}>
                      <tr
                        className={
                          (record._saving ? "row-saving" : "") +
                          (flashRowId === record.student_id ? " row-flash-success" : "")
                        }
                      >
                        <td>{record.roll_number}</td>
                        <td>{record.student_name}</td>
                        <td>
                          <div className="status-toggle">
                            {["present", "late", "absent"].map((s) => (
                              <button
                                key={s}
                                className={`status-pill ${s} ${record.status === s ? "active" : ""}`}
                                onClick={() => handleUpdateAttendance(record.student_id, s)}
                                disabled={record.status === s || record._saving}
                                title={`Mark as ${s}`}
                              >
                                {record._saving && savingStudentId === record.student_id
                                  ? <span className="pill-spinner"></span>
                                  : s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span
                            title={
                              record.edited_at
                                ? `Last edited: ${record.edited_at}`
                                : ""
                            }
                            style={{ cursor: record.edited_at ? "help" : "default" }}
                          >
                            {record.marked_method || "—"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn-note ${record.notes ? "has-note" : ""}`}
                            onClick={() => {
                              if (editingNoteId === record.student_id) {
                                setEditingNoteId(null);
                                setNoteText("");
                              } else {
                                setEditingNoteId(record.student_id);
                                setNoteText(record.notes || "");
                              }
                            }}
                            title={record.notes ? `Note: ${record.notes}` : "Add a note"}
                          >
                            {record.notes ? "Note" : "Add"}
                          </button>
                        </td>
                      </tr>
                      {/* Inline Note Editor */}
                      {editingNoteId === record.student_id && (
                        <tr className="note-row">
                          <td colSpan="5">
                            <div className="note-editor">
                              <div style={{ flex: 1 }}>
                                <textarea
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  maxLength={500}
                                  placeholder="Add a note or reason (e.g., medical leave, late bus)..."
                                  autoFocus
                                />
                                <div className="note-char-count">{noteText.length}/500</div>
                              </div>
                              <div className="note-actions">
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleSaveNote(record.student_id, record.status)}
                                  disabled={savingNote}
                                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                >
                                  {savingNote ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setNoteText("");
                                  }}
                                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}

            {/* Empty state */}
            {attendanceDivision && attendanceDate && attendanceRecords.length === 0 && !loadingAttendance && (
              <div className="alert alert-info">
                No students found in this division or no attendance records. Click "Load Attendance" to fetch records.
              </div>
            )}

            {/* Loading state */}
            {loadingAttendance && (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                <div className="spinner"></div>
                <p className="text-muted">Loading attendance records...</p>
              </div>
            )}
          </div>
        )}
    </AppShell>
  );
}
export default AdminDashboard;