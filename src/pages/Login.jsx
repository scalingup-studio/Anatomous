// src__pages__Login.jsx
/**
 * Fixed Login Page
 * Key changes:
 * 1. Use tokenManager for token storage
 * 2. Simplified login flow
 * 3. Better error handling
 */

import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "../components/Logo.jsx";
import { SignupPage } from "./Signup.jsx";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal.jsx";
import { useAuth } from "../api/AuthContext";
import { useNotifications } from "../api/NotificationContext.jsx";
import NotificationSystem from "../components/NotificationSystem.jsx";

export function LoginPage({ onOpenSignup }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [emailHint, setEmailHint] = React.useState("");
  const [passwordHint, setPasswordHint] = React.useState("");
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [signupOpen, setSignupOpen] = React.useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();

  function validate() {
    let ok = true;
    setEmailHint("");
    setPasswordHint("");

    if (!email || !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(email)) {
      setEmailHint("Please enter a valid email");
      ok = false;
    }
    if (!password) {
      setPasswordHint("Please enter your password");
      ok = false;
    }
    return ok;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    try {
      setLoading(true);
      console.log('🔐 Attempting login...');

      // Use login from AuthContext - it handles token storage via tokenManager
      const result = await login(email, password);

      if (!result.success) {
        throw new Error(result.error || "Login failed");
      }

      console.log('✅ Login successful, redirecting to root...');

      // Navigate to root - AutoRedirectRoute will handle the rest
      navigate("/", { replace: true });

    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err.message || "Login failed. Please check your credentials.");
      showError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      console.log('🔗 Starting Google OAuth...');

      // Import AuthApi dynamically
      const { AuthApi } = await import('../api/authApi.js');

      const url = await AuthApi.getGoogleAuthUrl();

      if (!url) {
        throw new Error('Failed to get Google OAuth URL');
      }

      console.log('✅ Redirecting to Google...');
      window.location.href = url;

    } catch (err) {
      console.error('❌ Google login failed:', err);
      setError('Failed to start Google login. Please try again.');
      showError('Failed to start Google login');
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <div style={{ marginBottom: 16 }}>
          <Logo height={56} className="logo-anatomous" />
        </div>
        <h1 className="auth-title">Log In</h1>

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            {emailHint && <p className="field-hint">{emailHint}</p>}
          </div>

          <div className="form-field password">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="toggle-visibility"
              aria-label="Toggle password visibility"
              onClick={() => setShowPassword(s => !s)}
              disabled={loading}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
            {passwordHint && <p className="field-hint">{passwordHint}</p>}
          </div>

          <div className="form-row between">
            <label className="checkbox">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              <span>Remember me</span>
            </label>
            <a
              className="link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setForgotOpen(true);
              }}
            >
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className="btn primary"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <div className="divider"><span>or</span></div>

          <div className="social-buttons">
            <button
              type="button"
              className="btn outline"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
              />
              <span>Log in with Google</span>
            </button>

            <button
              type="button"
              className="btn outline"
              onClick={() => alert("Apple Sign-In integration depends on your backend")}
              disabled={loading}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg"
                alt="Apple"
              />
              <span>Log in with Apple</span>
            </button>
          </div>

          <p className="alt-action">
            No account yet? {(
              <a
                className="link"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setSignupOpen(true);
                }}
              >
                Sign up
              </a>
            )}
          </p>

          {error && <div className="alert">{error}</div>}
        </form>

        <ForgotPasswordModal
          open={forgotOpen}
          onClose={() => setForgotOpen(false)}
        />

        {signupOpen && (
          <SignupPage onClose={() => setSignupOpen(false)} />
        )}
      </section>

      <aside className="artwork">
        <img src="./images/login_image.avif" alt="Artwork" />
      </aside>

      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}
