
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./StudentDashboard.css";

const API_URL = "http://localhost:5000/api";

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const token = localStorage.getItem("token");

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await axios.get(
        `${API_URL}/attendance/history`,
        authHeaders
      );

      setHistory(response.data.records ?? []);
    } catch (err) {
      setHistoryError(
        err.response?.data?.message ||
        "Could not load attendance history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [userResponse, attendanceResponse] = await Promise.all([
        axios.get(`${API_URL}/auth/me`, authHeaders),
        axios.get(`${API_URL}/attendance/today`, authHeaders),
      ]);

      setUser(userResponse.data.user ?? userResponse.data);
      setAttendance(
        attendanceResponse.data.attendance ??
        attendanceResponse.data ??
        null
      );
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/");
        return;
      }

      setError(
        err.response?.data?.message ||
        "Could not load your attendance. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    loadDashboard();
    loadHistory();
  }, []);


  async function handleAttendanceAction(action) {
    try {
      setSubmitting(true);
      setMessage("");
      setError("");

      const response = await axios.post(
        `${API_URL}/attendance/${action}`,
        {},
        authHeaders
      );

      setMessage(response.data.message || "Request submitted successfully.");
      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "The request failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  }

  if (loading) {
    return (
      <main className="student-loading">
        <div className="loading-spinner" />
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  const checkInPending = attendance?.status === "PENDING";
  const checkInRejected = attendance?.status === "REJECTED";
  const checkedIn = Boolean(attendance?.checkInAt);
  const checkedOut = Boolean(attendance?.checkOutAt);
  const checkOutPending = attendance?.checkOutStatus === "PENDING";
  const checkOutRejected = attendance?.checkOutStatus === "REJECTED";
  const checkOutApproved = attendance?.checkOutStatus === "APPROVED";

  let actionLabel = "Check in";
  let actionType = "check-in";
  let actionDisabled = false;

  if (!attendance) {
    actionLabel = "Check in";
  } else if (checkInPending) {
    actionLabel = "Check-in awaiting approval";
    actionDisabled = true;
  } else if (checkInRejected) {
    actionLabel = "Check-in rejected";
    actionDisabled = true;
  } else if (checkedIn && !checkedOut) {
    if (checkOutPending) {
      actionLabel = "Check-out awaiting approval";
      actionDisabled = true;
    } else {
      actionLabel = checkOutRejected ? "Request check-out again" : "Check out";
      actionType = "check-out";
    }
  } else if (checkedOut && checkOutApproved) {
    actionLabel = "Attendance completed";
    actionDisabled = true;
  } else if (checkedOut) {
    actionLabel = "Check-out submitted";
    actionDisabled = true;
  }

  return (
    <main className="student-page">
      <header className="student-header">
        <div className="student-brand">
          <div className="student-brand-mark">A</div>
          <span>Attend</span>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Log out <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="student-content">
        <section className="student-welcome">
          <div>
            <p className="student-eyebrow">STUDENT PORTAL</p>
            <h1>
              Welcome back{user?.name ? `, ${user.name}` : ""}.
            </h1>
            <p className="student-subtitle">
              Keep track of your attendance for today.
            </p>
          </div>

          <div className="today-badge">
            <span className="today-indicator" />
            Today’s attendance
          </div>
        </section>

        {message && (
          <div className="student-alert success-alert" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="student-alert error-alert" role="alert">
            {error}
          </div>
        )}

        <section className="student-main-grid">
          <article className="attendance-card">
            <div className="card-topline">
              <span className="card-icon">◷</span>
              <span className="card-caption">DAILY ATTENDANCE</span>
            </div>

            <h2>Mark your attendance</h2>
            <p className="card-description">
              Submit your check-in and check-out requests. Your attendance
              will update after admin approval.
            </p>

            <div className="attendance-time-grid">
              <div className="time-item">
                <span>Check-in time</span>
                <strong>
                  {attendance?.checkInAt
                    ? new Date(attendance.checkInAt).toLocaleTimeString(
                      "en-IN",
                      { hour: "2-digit", minute: "2-digit" }
                    )
                    : "--:--"}
                </strong>
              </div>

              <div className="time-divider" />

              <div className="time-item">
                <span>Check-out time</span>
                <strong>
                  {attendance?.checkOutAt
                    ? new Date(attendance.checkOutAt).toLocaleTimeString(
                      "en-IN",
                      { hour: "2-digit", minute: "2-digit" }
                    )
                    : "--:--"}
                </strong>
              </div>
            </div>

            <button
              className="attendance-action"
              disabled={submitting || actionDisabled}
              onClick={() => handleAttendanceAction(actionType)}
            >
              {submitting ? "Submitting..." : actionLabel}
              {!submitting && !actionDisabled && (
                <span aria-hidden="true">→</span>
              )}
            </button>

            <p className="action-footnote">
              {actionDisabled
                ? "Check your attendance status below for updates."
                : "Make sure your attendance request is correct before submitting."}
            </p>
          </article>

          <article className="status-card">
            <div className="status-card-heading">
              <div>
                <p className="card-caption">CURRENT STATUS</p>
                <h2>Your attendance</h2>
              </div>
              <span className="status-symbol">✓</span>
            </div>

            <div className="status-row">
              <span>Check-in</span>
              <span
                className={`status-pill ${checkInPending
                    ? "status-pending"
                    : checkInRejected
                      ? "status-rejected"
                      : attendance?.status === "PRESENT"
                        ? "status-approved"
                        : "status-neutral"
                  }`}
              >
                {!attendance
                  ? "Not marked"
                  : attendance.status === "PENDING"
                    ? "Pending"
                    : attendance.status === "PRESENT"
                      ? "Approved"
                      : attendance.status === "REJECTED"
                        ? "Rejected"
                        : attendance.status}
              </span>
            </div>

            <div className="status-row">
              <span>Check-out</span>
              <span
                className={`status-pill ${checkOutPending
                    ? "status-pending"
                    : checkOutRejected
                      ? "status-rejected"
                      : checkOutApproved
                        ? "status-approved"
                        : "status-neutral"
                  }`}
              >
                {!checkedOut
                  ? checkOutPending
                    ? "Pending"
                    : checkOutRejected
                      ? "Rejected"
                      : "Not marked"
                  : checkOutPending
                    ? "Pending"
                    : checkOutApproved
                      ? "Approved"
                      : checkOutRejected
                        ? "Rejected"
                        : "Submitted"}
              </span>
            </div>

            <div className="status-note">
              <span className="status-note-icon">i</span>
              <p>
                {checkInPending
                  ? "Your check-in request is waiting for admin approval."
                  : checkInRejected
                    ? "Your check-in was rejected. Please contact your administrator."
                    : checkOutPending
                      ? "Your check-out request is waiting for admin approval."
                      : checkOutRejected
                        ? "Your check-out was rejected. You can submit it again."
                        : checkOutApproved
                          ? "Your attendance for today is complete."
                          : attendance?.status === "PRESENT"
                            ? "Your check-in is approved. Remember to check out before leaving."
                            : "Check in to record your attendance for today."}
              </p>
            </div>

            <button
              className="refresh-button"
              onClick={loadDashboard}
              disabled={submitting}
            >
              ↻ Refresh status
            </button>


          </article>
        </section>
        {/* Attendance History */}
        <section className="history-section">
          <h2>Attendance History</h2>

          {historyLoading ? (
            <p className="history-message">Loading attendance history...</p>
          ) : historyError ? (
            <p className="history-error">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="history-message">
              No attendance records found.
            </p>
          ) : (
            <div className="history-list">
              {history.map((record) => (
                <div className="history-card" key={record.id}>
                  <h3>
                    {new Date(record.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Kolkata",
                    })}
                  </h3>

                  <div className="history-details">
                    <p>
                      <strong>Check-in time:</strong>{" "}
                      {record.checkInAt
                        ? new Date(record.checkInAt).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kolkata",
                          }
                        )
                        : "—"}
                    </p>

                    <p>
                      <strong>Check-in status:</strong>{" "}
                      {record.status ?? "Pending"}
                    </p>

                    <p>
                      <strong>Check-out time:</strong>{" "}
                      {record.checkOutAt
                        ? new Date(record.checkOutAt).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kolkata",
                          }
                        )
                        : "—"}
                    </p>

                    <p>
                      <strong>Check-out status:</strong>{" "}
                      {record.checkOutStatus ?? "Not requested"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="student-footer">
          <span>AttendEase</span>
          <span>One day at a time.</span>
        </footer>
      </div>
    </main>
  );
}
