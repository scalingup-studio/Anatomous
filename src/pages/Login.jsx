// src__pages__Login.jsx
/**
 * Fixed Login Page
 * Key changes:
 * 1. Use tokenManager for token storage
 * 2. Simplified login flow
 * 3. Better error handling
 */

import React from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Logo } from "../components/Logo.jsx";
import { SignupPage } from "./Signup.jsx";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal.jsx";
import { Modal } from "../components/Modal.jsx";
import { useAuth } from "../api/AuthContext";
import { useNotifications } from "../api/NotificationContext.jsx";
import NotificationSystem from "../components/NotificationSystem.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";

export function LoginPage({ onOpenSignup }) {
  const { isLight } = useTheme();
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
  const [mfaOpen, setMfaOpen] = React.useState(false);
  const [mfaCode, setMfaCode] = React.useState("");
  const [mfaLoading, setMfaLoading] = React.useState(false);
  const [mfaMessage, setMfaMessage] = React.useState("");
  const [pendingEmail, setPendingEmail] = React.useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyMfa } = useAuth();
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();

  // Read ?plan= from URL (e.g. #/login?plan=family) and auto-open signup if present
  const { planValue, hasPlanParam } = React.useMemo(() => {
    try {
      // With HashRouter the query string lives in the hash, e.g. "#/login?plan=family"
      const hash = window.location.hash || "";
      const idx = hash.indexOf("?");
      if (idx === -1) {
        return { planValue: "", hasPlanParam: false };
      }
      const query = hash.slice(idx + 1); // part after "?"
      const params = new URLSearchParams(query);
      const raw = params.get("plan");
      const value = (raw || "").trim();
      return {
        planValue: value,
        hasPlanParam: params.has("plan"),
      };
    } catch {
      return { planValue: "", hasPlanParam: false };
    }
  }, [location.hash]);

  React.useEffect(() => {
    if (hasPlanParam) {
      // Automatically open signup modal when ?plan= is present (even if empty)
      setSignupOpen(true);
    }
  }, [hasPlanParam, planValue]);

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

      // Use login from AuthContext - it handles token storage & MFA flow
      const result = await login(email, password);

      if (result.mfaRequired) {
        // MFA step required: show MFA dialog and do NOT navigate yet
        setPendingEmail(email);
        setMfaCode("");
        setMfaMessage(result.message || "MFA code sent to your email.");
        setMfaOpen(true);
        showSuccess(result.message || "MFA code sent to your email.");
        return;
      }

      if (!result.success) {
        throw new Error(result.error || "Login failed");
      }

      // Navigate to root - AutoRedirectRoute will handle the rest
      navigate("/", { replace: true });

    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      showError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitMfa(e) {
    e.preventDefault();
    if (!pendingEmail || !mfaCode.trim()) {
      setError("Please enter the MFA code from your email.");
      return;
    }
    try {
      setMfaLoading(true);
      setError("");
      const res = await verifyMfa(pendingEmail, mfaCode.trim());
      if (!res.success) {
        throw new Error(res.error || "Invalid MFA code.");
      }
      showSuccess("MFA verified successfully. You are now logged in.");
      setMfaOpen(false);
      setMfaCode("");
      setPendingEmail("");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "MFA verification failed.");
      showError(err.message || "MFA verification failed.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);

      // Import AuthApi dynamically
      const { AuthApi } = await import('../api/authApi.js');

      const url = await AuthApi.getGoogleAuthUrl();

      if (!url) {
        throw new Error('Failed to get Google OAuth URL');
      }

      window.location.href = url;

    } catch (err) {
      setError('Failed to start Google login. Please try again.');
      showError('Failed to start Google login');
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    try {
      setLoading(true);
      setError('');

      console.log('🍎 [1] Starting Apple login...');

      // Import AuthApi dynamically
      const { AuthApi } = await import('../api/authApi.js');
      console.log('🍎 [2] AuthApi imported');

      console.log('🍎 [3] Calling endpoint: /auth/apple');
      
      const url = await AuthApi.getAppleAuthUrl();
      console.log('🍎 [4] Received response from server');
      console.log('🍎 [5] URL value:', url);
      console.log('🍎 [6] URL type:', typeof url);
      console.log('🍎 [7] URL length:', url?.length);

      if (!url) {
        console.error('🍎 [ERROR] URL is empty or null');
        throw new Error('Failed to get Apple OAuth URL from server. The endpoint may not be configured.');
      }

      if (typeof url !== 'string') {
        console.error('🍎 [ERROR] URL is not a string:', url);
        throw new Error('Invalid URL format received from server.');
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.error('🍎 [ERROR] URL does not start with http:// or https://:', url);
        throw new Error('Invalid URL format: must start with http:// or https://');
      }

      console.log('🍎 [8] URL is valid, redirecting to Apple...');
      console.log('🍎 [9] Full URL:', url);
      
      // Використовуємо window.location.replace для надійності
      window.location.replace(url);
      
      // Fallback на href якщо replace не спрацював
      setTimeout(() => {
        if (window.location.href !== url) {
          console.log('🍎 [10] Fallback: using window.location.href');
          window.location.href = url;
        }
      }, 100);

    } catch (err) {
      console.error('❌ Apple login error:', err);
      console.error('❌ Error details:', {
        message: err.message,
        status: err.status,
        stack: err.stack
      });
      
      // Більш детальна обробка помилок
      let errorMessage = 'Failed to start Apple login.';
      
      if (err.status === 404) {
        errorMessage = 'Apple login endpoint not found (404). Please configure the /auth/apple endpoint on the backend.';
      } else if (err.status === 500) {
        errorMessage = 'Server error. Please check backend configuration.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      showError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="theme-toggle-container" style={{ 
        position: "absolute", 
        top: 20, 
        right: 20, 
        zIndex: 9 
      }}>
        <ThemeToggle showLabel={true} size="default" />
      </div>
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
              onClick={handleAppleLogin}
              disabled={loading}
            >
              {isLight ? (
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
                  alt="Apple"
                  style={{ width: 18, height: 20, marginBottom: 4 }}
                />
              ) : (
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg"
                  alt="Apple"
                  style={{ width: 18, height: 20, marginBottom: 4 }}
                />
              )}
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
          <SignupPage
            onClose={() => setSignupOpen(false)}
            initialPlan={planValue}
          />
        )}

        {/* MFA Code Modal (user-friendly) */}
        <Modal
          open={mfaOpen}
          title="Enter MFA Code"
          onClose={() => {
            if (mfaLoading) return;
            setMfaOpen(false);
            setMfaCode("");
          }}
        >
          <form onSubmit={onSubmitMfa} style={{ display:"grid", gap:16 }}>
            <p style={{ fontSize:13, color:"var(--muted)", margin:0 }}>
              {mfaMessage ||
                "For your security, we’ve emailed a one-time 6‑digit code to your account email. Enter it below to finish signing in."}
            </p>
            <div className="form-field">
              <label htmlFor="mfa-code">MFA Code</label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={mfaCode}
                onChange={(e)=>setMfaCode(e.target.value.replace(/\D/g, ""))}
                disabled={mfaLoading}
                autoFocus
                style={{ textAlign:"center", letterSpacing:"0.3em" }}
              />
              <p style={{ fontSize:11, color:"var(--muted)", marginTop:4 }}>
                Didn’t receive a code? Check your spam folder or wait a few seconds, then request a new login.
              </p>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:4 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  if (mfaLoading) return;
                  setMfaOpen(false);
                  setMfaCode("");
                }}
                disabled={mfaLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={mfaLoading || mfaCode.trim().length !== 6}
              >
                {mfaLoading ? "Verifying..." : "Verify code"}
              </button>
            </div>
          </form>
        </Modal>
      </section>

      <aside className="artwork">
        <img src={`${import.meta.env.BASE_URL}images/image_Pippit_202511112127.png`} alt="Artwork" />
      </aside>

      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}
