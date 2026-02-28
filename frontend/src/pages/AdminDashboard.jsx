/**
 * Complete Admin Dashboard with all management features
 */
import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { adminAPI, timetableAPI } from "../services/api";
import "../styles/dashboard.css";
function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSubTab, setActiveSubTab] = useState("students");
  const [message, setMessage] = useState({ type: "", text: "" });
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
  const [timetableSessions, setTimetableSessions] = useState([]);
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
  const [timetableForm, setTimetableForm] = useState({
    division_id: "",
    batch_id: "",
    subject_id: "",
    staff_id: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    session_type: "theory",
    room_number: ""
  });
  const [parentForm, setParentForm] = useState({
    student_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    relation: "father",
    username: "",
    password: ""
  });
  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);
  const loadAllData = async () => {
    try {
      const [depts, cls, divs, studs, stf, subjs, btchs, prnts, sessions] =
        await Promise.all([
          adminAPI.getDepartments(),
          adminAPI.getClasses(),
          adminAPI.getDivisions(),
          adminAPI.getStudents(),
          adminAPI.getStaff(),
          adminAPI.getSubjects(),
          adminAPI.getBatches(),
          adminAPI.getParents(),
          timetableAPI.getAllSessions(),
        ]);
      setDepartments(depts);
      setClasses(cls);
      setDivisions(divs);
      setStudents(studs);
      setStaff(stf);
      setSubjects(subjs);
      setBatches(btchs);
      setParents(prnts);
      setTimetableSessions(sessions);
    } catch (error) {
      showMessage("error", "Failed to load data");
    }
  };
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };
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
        const blob = await fetch(capturedImage).then((r) => r.blob());
        const file = new File([blob], "face.jpg", { type: "image/jpeg" });
        const faceFormData = new FormData();
        faceFormData.append("image", file);
        await adminAPI.registerStudentFace(newStudent.id, faceFormData);
        showMessage("success", "Student created with face registration!");
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

  const handleCreateTimetable = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...timetableForm,
        division_id: parseInt(timetableForm.division_id),
        batch_id: timetableForm.batch_id ? parseInt(timetableForm.batch_id) : null,
        subject_id: parseInt(timetableForm.subject_id),
        staff_id: parseInt(timetableForm.staff_id),
        day_of_week: parseInt(timetableForm.day_of_week),
        start_time: timetableForm.start_time,
        end_time: timetableForm.end_time,
        session_type: timetableForm.session_type,
        room_number: timetableForm.room_number || null,
      };

      await timetableAPI.createSession(payload);
      showMessage("success", "Timetable session created successfully!");
      setTimetableForm({
        division_id: "",
        batch_id: "",
        subject_id: "",
        staff_id: "",
        day_of_week: "",
        start_time: "",
        end_time: "",
        session_type: "theory",
        room_number: ""
      });
      loadAllData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to create timetable session";
      showMessage("error", errorMsg);
    }
  };
  // Register face for existing student
  const handleRegisterFace = async (studentId) => {
    if (!capturedImage) {
      showMessage("error", "Please capture a face first");
      return;
    }
    try {
      const blob = await fetch(capturedImage).then((r) => r.blob());
      const file = new File([blob], "face.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("image", file);
      await adminAPI.registerStudentFace(studentId, formData);
      showMessage("success", "Face registered successfully!");
      setSelectedStudentForFace(null);
      setCapturedImage(null);
      setShowCamera(false);
      loadAllData();
    } catch (error) {
      showMessage("error", "Failed to register face");
    }
  };
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>System Management Portal - {user.username}</p>
        </div>
        <button className="btn btn-danger" onClick={onLogout}>
          Logout
        </button>
      </div>
      <div className="container">
        {message.text && (
          <div
            className={`alert alert-${message.type === "error" ? "danger" : "success"}`}
          >
            {message.text}
          </div>
        )}
        <div className="tabs">
          <button
            className={`tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>
          <button
            className={`tab ${activeTab === "structure" ? "active" : ""}`}
            onClick={() => setActiveTab("structure")}
          >
            🏛️ Academic Structure
          </button>
          <button
            className={`tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👥 Users
          </button>
          <button
            className={`tab ${activeTab === "timetable" ? "active" : ""}`}
            onClick={() => setActiveTab("timetable")}
          >
            🗓️ Timetable
          </button>
        </div>
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
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
                            🗑️ Delete
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
                      <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="tel"
                          value={staffForm.phone}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              phone: e.target.value,
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
                        ✅ Create Class
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
                                🗑️ Delete
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
                        ✅ Create Division
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
                                🗑️ Delete
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
                    onClick={() => setShowStudentForm(!showStudentForm)}
                  >
                    + Add Student
                  </button>
                </div>
                {showStudentForm && (
                  <form onSubmit={handleCreateStudent} className="form-box">
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
                        <label>Username *</label>
                        <input
                          type="text"
                          required
                          value={studentForm.username}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              username: e.target.value,
                            })
                          }
                          placeholder="john.doe"
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
                        <small className="text-muted">
                          Options: 1K, 2K, 3K, 4K, 5K, 6K
                        </small>
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
                        <small className="text-muted">Options: A, B</small>
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
                      <label>📸 Face Photo (for AI Recognition)</label>
                      {!showCamera && !capturedImage && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setShowCamera(true)}
                        >
                          📷 Open Camera to Capture Face
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
                              ✓ Capture Face
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
                              🔄 Retake Photo
                            </button>
                            <span className="text-success">
                              ✓ Face captured successfully
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
                        ✅ Create Student
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowStudentForm(false)}
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
                          <td>{student.face_registered ? "✅" : "❌"}</td>
                          <td>
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
                              🗑️ Delete
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
                    onClick={() => setShowStaffForm(!showStaffForm)}
                  >
                    + Add Staff
                  </button>
                </div>
                {showStaffForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await adminAPI.createStaff({
                          ...staffForm,
                          department_id: parseInt(staffForm.department_id),
                          class_id: staffForm.class_id
                            ? parseInt(staffForm.class_id)
                            : null,
                          division_id: staffForm.division_id
                            ? parseInt(staffForm.division_id)
                            : null,
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
                          class_id: "",
                          division_id: "",
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
                    <div className="alert alert-info">
                      ℹ️ Assign class and division to make this staff a class
                      teacher. Class teachers can mark attendance for their
                      assigned class.
                    </div>
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
                      <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="tel"
                          value={staffForm.phone}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              phone: e.target.value,
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
                              class_id: "",
                              division_id: "",
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
                        <label>Class Teacher For (Optional)</label>
                        <select
                          value={staffForm.class_id}
                          disabled={!staffForm.department_id}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              class_id: e.target.value,
                              division_id: "",
                            })
                          }
                        >
                          <option value="">Not a class teacher</option>
                          {classes
                            .filter(
                              (c) =>
                                c.department_id ===
                                parseInt(staffForm.department_id),
                            )
                            .map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                        </select>
                        <small className="text-muted">
                          Select which class this teacher is responsible for
                          (1K-6K)
                        </small>
                      </div>
                      <div className="form-group">
                        <label>Division (Optional)</label>
                        <select
                          value={staffForm.division_id}
                          disabled={!staffForm.class_id}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              division_id: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Division</option>
                          {divisions
                            .filter(
                              (d) =>
                                d.class_id === parseInt(staffForm.class_id),
                            )
                            .map((div) => (
                              <option key={div.id} value={div.id}>
                                Division {div.name}
                              </option>
                            ))}
                        </select>
                        <small className="text-muted">
                          Select division A or B
                        </small>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Username *</label>
                        <input
                          type="text"
                          required
                          value={staffForm.username}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              username: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Password *</label>
                        <input
                          type="password"
                          required
                          value={staffForm.password}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              password: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        ✅ Create Staff
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowStaffForm(false)}
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
                              🗑️ Delete
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
                    onClick={() => setShowParentForm(!showParentForm)}
                  >
                    + Add Parent
                  </button>
                </div>
                {showParentForm && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await adminAPI.createParent(parentForm);
                        showMessage("success", "Parent account created!");
                        setShowParentForm(false);
                        setParentForm({
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
                      ℹ️ Parent accounts are linked to a specific student.
                      Parents can view their child's attendance.
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Select Student (Child) *</label>
                        <select
                          required
                          value={parentForm.student_id}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              student_id: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Student</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.roll_number} - {student.first_name}{" "}
                              {student.last_name}
                            </option>
                          ))}
                        </select>
                        <small className="text-muted">
                          This is the student (ward) for this parent account
                        </small>
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
                        <label>Username *</label>
                        <input
                          type="text"
                          required
                          value={parentForm.username}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              username: e.target.value,
                            })
                          }
                          placeholder="parent.name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Password *</label>
                        <input
                          type="password"
                          required
                          value={parentForm.password}
                          onChange={(e) =>
                            setParentForm({
                              ...parentForm,
                              password: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-success">
                        ✅ Create Parent Account
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowParentForm(false)}
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
                      <th>Student (Ward)</th>
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
                        const student = students.find(
                          (item) => item.id === parent.student_id,
                        );
                        return (
                          <tr key={parent.id}>
                            <td>
                              {parent.first_name} {parent.last_name}
                            </td>
                            <td>{parent.relation}</td>
                            <td>{parent.phone}</td>
                            <td>
                              {student
                                ? `${student.roll_number} - ${student.first_name} ${student.last_name}`
                                : `Student ID ${parent.student_id}`}
                            </td>
                            {hasParentUsername && (
                              <td>{parent.username || "-"}</td>
                            )}
                            <td>
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
                                🗑️ Delete
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
        {/* TIMETABLE TAB */}
        {activeTab === "timetable" && (
          <div>
            <h2>Timetable Management</h2>
            
            {/* CREATE TIMETABLE SESSION */}
            <div className="card">
              <h3>Create Timetable Session</h3>
              <form onSubmit={handleCreateTimetable} className="form-box">
                <div className="form-row">
                  <div className="form-group">
                    <label>Division *</label>
                    <select
                      required
                      value={timetableForm.division_id}
                      onChange={(e) => setTimetableForm({ ...timetableForm, division_id: e.target.value })}
                    >
                      <option value="">Select Division</option>
                      {divisions.map((div) => {
                        const cls = classes.find(c => c.id === div.class_id)
                        return (
                          <option key={div.id} value={div.id}>
                            {cls?.name || ''} {div.name}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Batch (Optional for Lab)</label>
                    <select
                      value={timetableForm.batch_id}
                      onChange={(e) => setTimetableForm({ ...timetableForm, batch_id: e.target.value })}
                    >
                      <option value="">None (Theory)</option>
                      {batches.filter(b => b.division_id === parseInt(timetableForm.division_id)).map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Subject *</label>
                    <select
                      required
                      value={timetableForm.subject_id}
                      onChange={(e) => setTimetableForm({ ...timetableForm, subject_id: e.target.value })}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.name} ({subj.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Staff *</label>
                    <select
                      required
                      value={timetableForm.staff_id}
                      onChange={(e) => setTimetableForm({ ...timetableForm, staff_id: e.target.value })}
                    >
                      <option value="">Select Staff</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} ({s.staff_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Day of Week *</label>
                    <select
                      required
                      value={timetableForm.day_of_week}
                      onChange={(e) => setTimetableForm({ ...timetableForm, day_of_week: e.target.value })}
                    >
                      <option value="">Select Day</option>
                      <option value="0">Monday</option>
                      <option value="1">Tuesday</option>
                      <option value="2">Wednesday</option>
                      <option value="3">Thursday</option>
                      <option value="4">Friday</option>
                      <option value="5">Saturday</option>
                      <option value="6">Sunday</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Session Type *</label>
                    <select
                      required
                      value={timetableForm.session_type}
                      onChange={(e) => setTimetableForm({ ...timetableForm, session_type: e.target.value })}
                    >
                      <option value="theory">Theory</option>
                      <option value="lab">Lab</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      type="time"
                      required
                      value={timetableForm.start_time}
                      onChange={(e) => setTimetableForm({ ...timetableForm, start_time: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Time *</label>
                    <input
                      type="time"
                      required
                      value={timetableForm.end_time}
                      onChange={(e) => setTimetableForm({ ...timetableForm, end_time: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Room Number</label>
                    <input
                      type="text"
                      value={timetableForm.room_number}
                      onChange={(e) => setTimetableForm({ ...timetableForm, room_number: e.target.value })}
                      placeholder="e.g., Lab 101"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Create Session
                  </button>
                </div>
              </form>
            </div>

            {/* ALL TIMETABLE SESSIONS */}
            <div className="card">
              <h3>All Timetable Sessions ({timetableSessions.length})</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Division/Batch</th>
                    <th>Subject</th>
                    <th>Staff</th>
                    <th>Type</th>
                    <th>Room</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timetableSessions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-muted">
                        No timetable sessions created yet.
                      </td>
                    </tr>
                  ) : (
                    timetableSessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.day}</td>
                        <td>{session.start_time} - {session.end_time}</td>
                        <td>
                          {session.division}
                          {session.batch && ` - ${session.batch}`}
                        </td>
                        <td>{session.subject}</td>
                        <td>{session.staff}</td>
                        <td>
                          {session.session_type === 'theory' ? 'Theory' : 'Lab'}
                        </td>
                        <td>{session.room_number || '-'}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={async () => {
                              if (window.confirm(`Delete this timetable session?`)) {
                                try {
                                  await timetableAPI.deleteSession(session.id);
                                  showMessage("success", "Session deleted successfully!");
                                  loadAllData();
                                } catch (error) {
                                  const errorMsg = error.response?.data?.detail || "Failed to delete session";
                                  showMessage("error", errorMsg);
                                }
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default AdminDashboard;