
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, getCurrentUser } from "../api/auth";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(location.state?.message || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const data = await login(email, password);

      if (!data.token) {
        throw new Error("Authentication token was not returned.");
      }

      const response = await getCurrentUser(data.token);
      const user = response.user ?? response;

      if (user.role !== "USER" && user.role !== "ADMIN") {
        throw new Error("Unable to determine your account role.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", user.role);

      navigate(user.role === "ADMIN" ? "/admin" : "/student", {
        replace: true,
      });
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <div className="brand-content">
          <div className="brand-mark">A</div>
          <p className="brand-eyebrow">ATTENDANCE MANAGEMENT</p>
          <h1>Make every day count.</h1>
          <p className="brand-description">
            A simple, organized way to manage daily attendance
            and keep track of your attendance activity.
          </p>

          <div className="brand-decoration" aria-hidden="true">
            <div className="decoration-card decoration-card-one">
              <span className="decoration-dot" />
              Daily attendance
              <strong>Stay on track</strong>
            </div>
            <div className="decoration-card decoration-card-two">
              <span className="decoration-check">✓</span>
              <div>
                <strong>One day at a time</strong>
                <span>Simple. Clear. Organized.</span>
              </div>
            </div>
          </div>
        </div>

        <p className="brand-footer">Your attendance, organized.</p>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="mobile-brand">
            <div className="brand-mark">A</div>
            <span>Attendance Portal</span>
          </div>

          <div className="form-heading">
            <span className="form-eyebrow">WELCOME BACK</span>
            <h2>Sign in to your account</h2>
            <p>Enter your account details to continue.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <div className="password-label-row">
              <label htmlFor="login-password">Password</label>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            {message && (
              <p className="auth-message" role="alert">
                {message}
              </p>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create an account</Link>
          </p>

          <p className="form-bottom-note">
            Secure access to your attendance account
          </p>
        </div>
      </section>
    </main>
  );
}
