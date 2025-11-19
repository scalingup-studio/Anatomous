import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotifications } from "../../api/NotificationContext.jsx";

/**
 * Checkout Cancel Page
 * Handles cancellation from Stripe Checkout
 */
export default function CheckoutCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  React.useEffect(() => {
    // Show notification that checkout was cancelled
    showNotification("Checkout was cancelled. No charges were made.", "info");
  }, [showNotification]);

  return (
    <div className="card" style={{ 
      maxWidth: 600, 
      margin: "40px auto", 
      padding: 40,
      textAlign: "center" 
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
      <h2 style={{ marginBottom: 12 }}>Checkout Cancelled</h2>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        You cancelled the checkout process. No charges were made to your account.
      </p>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 32 }}>
        If you'd like to upgrade your subscription, you can try again anytime from the Subscriptions page.
      </p>
      
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button 
          className="btn outline" 
          onClick={() => navigate("/dashboard")}
        >
          Go to Dashboard
        </button>
        <button 
          className="btn primary" 
          onClick={() => navigate("/dashboard/subscriptions")}
        >
          Back to Subscriptions
        </button>
      </div>
    </div>
  );
}

