
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminDashboard.css";

const API_URL = "http://localhost:5000/api";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const token = localStorage.getItem("token");

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [userResult, attendanceResult] = await Promise.all([
        axios.get(`${API_URL}/auth/me`, authHeaders),
        axios.get(`${API_URL}/attendance/admin/today`, authHeaders),
      ]);

      const currentUser = userResult.data.user ?? userResult.data;
      setUser(currentUser);
      setAttendance(attendanceResult.data.attendance ?? []);
    } catch (err) {
      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        navigate("/");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Could not load the admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  async function reviewAttendance(id, type, decision) {
    const actionKey = `${id}-${type}`;

    try {
      setBusyAction(actionKey);
      setError("");
      setMessage("");

      const response = await axios.patch(
        `${API_URL}/attendance/admin/${id}/${type}`,
        { decision },
        authHeaders
      );

      setMessage(
        response.data.message || "Attendance reviewed successfully."
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update attendance."
      );
    } finally {
      setBusyAction("");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  }

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    loadDashboard();
  }, []);

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(value) {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function Status({ value }) {
    const normalized = value || "NOT_MARKED";

    return (
      <span
        className={`admin-status admin-status-${normalized.toLowerCase()}`}
      >
        {normalized === "PRESENT"
          ? "Approved"
          : normalized === "APPROVED"
            ? "Approved"
            : normalized === "PENDING"
              ? "Pending"
              : normalized === "REJECTED"
                ? "Rejected"
                : normalized === "ABSENT"
                  ? "Absent"
                  : "Not marked"}
      </span>
    );
  }

  if (loading) {
    return (
      <main className="admin-loading">
        <p>Loading admin dashboard...</p>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-brand-mark">A</div>
          <span>
            Attendance Portal
          </span>
        </div>

        <button className="admin-logout" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <div className="admin-content">
        <section className="admin-welcome">
          <p className="admin-eyebrow">ADMIN PORTAL</p>
          <h1>Attendance management</h1>
          <p>
            Welcome{user?.name ? `, ${user.name}` : ""}. Review
            today's student attendance and approval requests.
          </p>
        </section>

        {message && (
          <div className="admin-message" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}

        <section className="admin-summary">
          <div className="admin-summary-card">
            <span>Today's records</span>
            <strong>{attendance.length}</strong>
          </div>

          <div className="admin-summary-card">
            <span>Pending check-ins</span>
            <strong>
              {attendance.filter(
                (record) => record.status === "PENDING"
              ).length}
            </strong>
          </div>

          <div className="admin-summary-card">
            <span>Pending check-outs</span>
            <strong>
              {attendance.filter(
                (record) => record.checkOutStatus === "PENDING"
              ).length}
            </strong>
          </div>
        </section>

        <section className="admin-attendance-section">
          <div className="admin-section-heading">
            <div>
              <h2>Today's attendance</h2>
              <p>Review check-in and check-out requests below.</p>
            </div>

            <button
              className="admin-refresh"
              onClick={loadDashboard}
              disabled={Boolean(busyAction)}
            >
              Refresh
            </button>
          </div>

          {attendance.length === 0 ? (
            <div className="admin-empty">
              No attendance records found for today.
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>Check-in status</th>
                    <th>Check-out</th>
                    <th>Check-out status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>
                          {record.student?.name || "Unnamed student"}
                        </strong>
                        <small>{record.student?.email || "—"}</small>
                      </td>

                      <td>{formatDate(record.date)}</td>
                      <td>{formatTime(record.checkInAt)}</td>

                      <td>
                        <Status value={record.status} />
                      </td>

                      <td>{formatTime(record.checkOutAt)}</td>

                      <td>
                        <Status value={record.checkOutStatus} />
                      </td>

                      <td>
                        <div className="admin-actions">
                          {record.status === "PENDING" && (
                            <>
                              <button
                                className="admin-approve"
                                disabled={Boolean(busyAction)}
                                onClick={() =>
                                  reviewAttendance(
                                    record.id,
                                    "check-in",
                                    "approve"
                                  )
                                }
                              >
                                {busyAction === `${record.id}-check-in`
                                  ? "Saving..."
                                  : "Approve check-in"}
                              </button>

                              <button
                                className="admin-reject"
                                disabled={Boolean(busyAction)}
                                onClick={() =>
                                  reviewAttendance(
                                    record.id,
                                    "check-in",
                                    "reject"
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {record.checkOutStatus === "PENDING" && (
                            <>
                              <button
                                className="admin-approve"
                                disabled={Boolean(busyAction)}
                                onClick={() =>
                                  reviewAttendance(
                                    record.id,
                                    "check-out",
                                    "approve"
                                  )
                                }
                              >
                                {busyAction === `${record.id}-check-out`
                                  ? "Saving..."
                                  : "Approve check-out"}
                              </button>

                              <button
                                className="admin-reject"
                                disabled={Boolean(busyAction)}
                                onClick={() =>
                                  reviewAttendance(
                                    record.id,
                                    "check-out",
                                    "reject"
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {record.status !== "PENDING" &&
                            record.checkOutStatus !== "PENDING" && (
                              <span className="admin-no-action">
                                No action needed
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
