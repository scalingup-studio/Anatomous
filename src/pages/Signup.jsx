import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../api/AuthContext.jsx";
import { useNotifications } from "../api/NotificationContext.jsx";
import { Modal } from "../components/Modal.jsx";
import { Logo } from "../components/Logo.jsx";
import { AuthApi } from "../api/authApi";
import { ProfilesApi } from "../api/profilesApi.js";

export function SignupPage({ onClose, initialPlan }) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [promoCode, setPromoCode] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [terms, setTerms] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const navigate = useNavigate?.() || (()=>{});
  const location = useLocation?.() || { search: "" };
  const { signup } = useAuth?.() || {};
  const { showSuccess, showError } = useNotifications();

  // Prefer explicit initialPlan prop, but also allow reading from current URL if missing
  const planFromUrl = React.useMemo(() => {
    if (initialPlan) return initialPlan;
    try {
      const params = new URLSearchParams(location.search || "");
      const plan = (params.get("plan") || "").trim();
      return plan || "";
    } catch {
      return "";
    }
  }, [initialPlan, location.search]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!terms) {
      setError("Please agree to the Terms");
      return;
    }

    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      setLoading(true);
      
      // Use AuthContext signup function to properly set isNewUser flag
      if (signup) {
        const res = await signup(email, password, {
          firstName,
          lastName,
          promo_code: promoCode || undefined
        });
        if (!res?.success) throw new Error(res?.error || "Signup failed");
        // SECURITY: Commented to prevent sensitive signup data leakage
        // console.log('📝 Signup via AuthContext successful');
      } else {
        // Fallback to direct API call if AuthContext not available
        const data = await AuthApi.signup({
          firstName,
          lastName,
          email,
          password,
          promo_code: promoCode || undefined
        });
        console.log('📝 Signup response data (fallback):', data);
        // Auth state is handled in AuthContext path; if context is missing,
        // the user will need to login manually afterward.
      }

      showSuccess("Account created successfully!");

      // Backend already creates profile on signup (new_profile),
      // so we skip duplicate profile creation here.
      
      // Redirect new users to onboarding to complete their profile setup.
      // Preserve selected plan in query (?plan=...) so we can route to Subscriptions after onboarding.
      const planQuery = planFromUrl ? `?plan=${encodeURIComponent(planFromUrl)}` : "";
      const onboardingPath = `/onboarding${planQuery}`;

      console.log('🎯 Attempting to navigate to', onboardingPath, 'after signup...');
      navigate(onboardingPath, { replace: true });
      
      // Fallback: if navigate doesn't work, try window.location with hash
      setTimeout(() => {
        const expectedHash = `#/onboarding${planQuery}`;
        if (window.location.hash !== expectedHash) {
          console.log('🔄 Navigate failed, using window.location fallback to', expectedHash);
          window.location.href = expectedHash;
        }
      }, 100);
      
      onClose?.();
    } catch (err) {
      const apiMessage = err?.data?.message || err?.message;
      setError(apiMessage || "Unexpected error during signup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title="Sign Up" onClose={onClose}>

      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="form-row" style={{ gap: 12 }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label htmlFor="firstName">First name</label>
            <input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" required />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" required />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="signupEmail">Email address</label>
          <input id="signupEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>

        <div className="form-field password">
          <label htmlFor="signupPassword">Password</label>
          <input id="signupPassword" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" required />
          <button type="button" className="toggle-visibility" aria-label="Toggle password visibility" onClick={() => setShowPassword(s => !s)}>{showPassword ? "Hide" : "Show"}</button>
        </div>

        <div className="form-field">
          <label htmlFor="promoCode">Promo code (optional)</label>
          <input id="promoCode" type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="Enter promo code" />
        </div>

        <label className="checkbox" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
          <span>I agree to the Terms</span>
        </label>

        {error ? <div className="alert">{error}</div> : null}

        <button className="btn primary" type="submit" disabled={loading || !terms}>{loading ? "Creating…" : "Create account"}</button>
      </form>
    </Modal>
  );
}


