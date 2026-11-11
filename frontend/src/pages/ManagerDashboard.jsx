import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ManagerDashboard.css";

const API_URL = "http://localhost:5000/api";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [manager, setManager] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const handleAuthFailure = useCallback((status) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      navigate("/", { replace: true });
      return true;
    }
    return false;
  }, [navigate]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [managerResponse, usersResponse] = await Promise.all([
        axios.get(`${API_URL}/auth/me`, authHeaders),
        axios.get(`${API_URL}/manager/users`, authHeaders),
      ]);

      const currentManager = managerResponse.data.user ?? managerResponse.data;
      setManager(currentManager);
      setUsers(usersResponse.data.users ?? []);
    } catch (err) {
      if (handleAuthFailure(err.response?.status)) return;

      setError(
        err.response?.data?.message ||
          "Could not load the manager dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [token, handleAuthFailure]);

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    loadDashboard();
  }, [token, navigate, loadDashboard]);

  async function promoteUser(userId) {
    setUpdatingUserId(userId);
    setError("");
    setMessage("");

    try {
      const response = await axios.patch(
        `${API_URL}/manager/users/${userId}/role`,
        { role: "ADMIN" },
        authHeaders
      );

      const updatedUser = response.data.user;
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id ? { ...user, ...updatedUser } : user
        )
      );
      setMessage(response.data.message || "User promoted to admin successfully.");
    } catch (err) {
      if (handleAuthFailure(err.response?.status)) return;

      setError(
        err.response?.data?.message ||
          "Could not update this user's role. Please try again."
      );
    } finally {
      setUpdatingUserId("");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/", { replace: true });
  }

  if (loading) {
    return (
      <main className="manager-loading">
        <div className="manager-spinner" aria-hidden="true" />
        <p>Loading manager dashboard...</p>
      </main>
    );
  }

  return (
    <main className="manager-page">
      <header className="manager-header">
        <div className="manager-brand">
          <div className="manager-brand-mark">A</div>
          <span>Attend</span>
        </div>
        <div className="manager-header-actions">
          <span className="manager-role-label">MANAGER</span>
          <button className="manager-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="manager-content">
        <section className="manager-welcome">
          <p className="manager-eyebrow">MANAGER PORTAL</p>
          <h1>User management</h1>
          <p>
            Welcome{manager?.name ? `, ${manager.name}` : ""}. Manage user
            accounts and grant administrator access.
          </p>
        </section>

        {message && <div className="manager-message" role="status">{message}</div>}
        {error && <div className="manager-error" role="alert">{error}</div>}

        <section className="manager-summary" aria-label="User account summary">
          <div className="manager-summary-card">
            <span>Total accounts</span>
            <strong>{users.length}</strong>
          </div>
          <div className="manager-summary-card">
            <span>Users</span>
            <strong>{users.filter((user) => user.role === "USER").length}</strong>
          </div>
          <div className="manager-summary-card">
            <span>Administrators</span>
            <strong>{users.filter((user) => user.role === "ADMIN").length}</strong>
          </div>
        </section>

        <section className="manager-users-section">
          <div className="manager-section-heading">
            <div>
              <h2>Registered accounts</h2>
              <p>Promote a user to give them administrator access.</p>
            </div>
            <button
              className="manager-refresh"
              onClick={() => {
                setMessage("");
                loadDashboard();
              }}
              disabled={loading || Boolean(updatingUserId)}
            >
              <span aria-hidden="true">↻</span> Refresh
            </button>
          </div>

          {users.length === 0 ? (
            <div className="manager-empty-state">
              <div className="manager-empty-icon" aria-hidden="true">⌁</div>
              <h3>No accounts found</h3>
              <p>There are currently no USER or ADMIN accounts to display.</p>
            </div>
          ) : (
            <div className="manager-table-wrap">
              <table className="manager-users-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Email address</th>
                    <th>Current role</th>
                    <th className="manager-action-heading">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td data-label="Account">
                        <div className="manager-user-name">
                          <span className="manager-avatar">
                            {(user.name || user.email || "U").charAt(0).toUpperCase()}
                          </span>
                          <strong>{user.name || "Unnamed user"}</strong>
                        </div>
                      </td>
                      <td data-label="Email address" className="manager-user-email">
                        {user.email}
                      </td>
                      <td data-label="Current role">
                        <span className={`manager-status manager-status-${user.role.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td data-label="Action" className="manager-action-cell">
                        {user.role === "USER" ? (
                          <button
                            className="manager-promote-button"
                            onClick={() => promoteUser(user.id)}
                            disabled={Boolean(updatingUserId)}
                          >
                            {updatingUserId === user.id ? "Updating..." : "Make Admin"}
                          </button>
                        ) : (
                          <span className="manager-already-admin">Administrator</span>
                        )}
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
