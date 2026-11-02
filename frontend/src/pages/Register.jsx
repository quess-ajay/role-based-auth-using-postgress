
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password);

      navigate("/", {
        replace: true,
        state: {
          message: "Account created successfully. You can now sign in.",
        },
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to create your account. Please try again."
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
          <p className="brand-eyebrow">YOUR ATTENDANCE JOURNEY</p>
          <h1>Start with a fresh page.</h1>
          <p className="brand-description">
            Create your account to check in, check out, and
            keep your daily attendance activity in one place.
          </p>

          <div className="register-benefits">
            <div>
              <span>01</span>
              <p>
                <strong>One account</strong>
                <small>Your own secure login</small>
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Daily attendance</strong>
                <small>Record your attendance activity</small>
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Clear status</strong>
                <small>Follow your approval status</small>
              </p>
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
            <span className="form-eyebrow">GET STARTED</span>
            <h2>Create your account</h2>
            <p>Fill in your details to register as a student.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />

            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <p className="password-hint">
              Use at least 8 characters.
            </p>

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
              {loading ? "Creating account..." : "Create account"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/">Sign in</Link>
          </p>

          <p className="form-bottom-note">
            Your account is created securely.
          </p>
        </div>
      </section>
    </main>
  );
}
