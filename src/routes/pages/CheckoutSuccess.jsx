import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PaymentApi } from "../../api/paymentApi.js";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { useAuth } from "../../api/AuthContext.jsx";

/**
 * Checkout Success Page
 * Handles successful return from Stripe Checkout
 * Verifies the session and displays payment/subscription details
 */
export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const { refreshAuth } = useAuth();
  const [status, setStatus] = React.useState("verifying"); // verifying | success | no-session | error
  const [result, setResult] = React.useState(null);
  
  // Захист від повторних викликів API
  const hasVerifiedRef = React.useRef(false);
  const sessionIdRef = React.useRef(null);

  React.useEffect(() => {
    const sessionId = searchParams.get("session_id");

    // Якщо sessionId не змінився і вже був виклик - не викликаємо знову
    if (hasVerifiedRef.current && sessionIdRef.current === sessionId) {
      console.log("⚠️ CheckoutSuccess: Already handled this session, skipping duplicate call");
      return;
    }

    // Якщо немає sessionId — показуємо сторінку без виклику бекенду
    if (!sessionId) {
      if (hasVerifiedRef.current) return;
      hasVerifiedRef.current = true;
      sessionIdRef.current = null;
      setResult(null);
      setStatus("no-session");
      showNotification("We could not find a payment session. Your payment is not completed.", "warning");
      return;
    }

    // Позначаємо, що починаємо верифікацію для цього sessionId
    hasVerifiedRef.current = true;
    sessionIdRef.current = sessionId;

    const verifySession = async () => {
      try {
        setStatus("verifying");

        console.log("🔍 CheckoutSuccess: Verifying payment session:", sessionId);

        // Verify the session with backend (GET /checkout/success?session_id=...)
        const sessionResult = await PaymentApi.checkoutSuccess(sessionId);

        console.log("✅ CheckoutSuccess: Backend response:", sessionResult);

        setResult(sessionResult || {});

        const isSuccess = sessionResult?.success === true;
        const message = isSuccess
          ? "Payment processed successfully! Your subscription is now active."
          : "Payment was not completed.";

        showNotification(message, isSuccess ? "success" : "warning");

        // Оновлюємо auth/юзера, щоб підписка відобразилась коректно
        if (isSuccess && typeof refreshAuth === "function") {
          try {
            await refreshAuth();
          } catch (err) {
            console.error("Failed to refresh auth after successful payment:", err);
          }
        }

        setStatus("success");
      } catch (error) {
        console.error("Checkout verification failed:", error);
        setStatus("error");
        showNotification(
          error?.message ||
            "Failed to verify payment. If you were charged, please contact support.",
          "error"
        );
      }
    };

    verifySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Використовуємо тільки searchParams як залежність

  const isBackendSuccess = result?.success === true;
  const paymentStatus = result?.payment_status;
  const subscriptionDetails =
    result?.subscription_details ||
    result?.subscription ||
    result?.session_details ||
    result?.result?.subscription_details ||
    null;
  const nextSteps = result?.next_steps || [];
  const displayNextSteps = React.useMemo(() => {
    if (isBackendSuccess) {
      return [
        "Your subscription has been activated.",
        "You now have access to all features included in your plan.",
        "Visit the Subscriptions page at any time to review or change your plan.",
      ];
    }
    if (nextSteps && nextSteps.length > 0) {
      return nextSteps;
    }
    if (status === "error") {
      return [
        "Check your email or bank statement to confirm whether the payment was processed.",
        "If you were charged but do not see your subscription, contact support.",
      ];
    }
    return [];
  }, [isBackendSuccess, nextSteps, status]);

  const handleGoToSubscription = () => {
    navigate("/dashboard/subscriptions");
  };

  const handleReturnToPlans = () => {
    navigate("/dashboard/subscriptions?tab=upgrade");
  };

  const handleSupport = () => {
    navigate("/dashboard/help-center");
  };

  return (
    <div className="card" style={{ 
      maxWidth: 600, 
      margin: "40px auto", 
      padding: 40,
      textAlign: "center" 
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>
        {status === "verifying" ? "⏳" : isBackendSuccess ? "✅" : "⚠️"}
      </div>

      <h2 style={{ marginBottom: 12 }}>
        {status === "verifying"
          ? "Verifying Payment..."
          : isBackendSuccess
          ? "Payment processed successfully!"
          : status === "no-session"
          ? "Payment not completed"
          : "Payment status unclear"}
      </h2>

      {/* Основне повідомлення */}
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>
        {(() => {
          if (status === "verifying") {
            return "Please wait while we confirm your payment with the provider.";
          }

          if (status === "no-session") {
            return "We could not find a payment session in the URL. Your payment has not been completed.";
          }

          if (status === "error") {
            return "We couldn't verify your payment. If you were charged, please contact support.";
          }

          if (isBackendSuccess) {
            return "Your payment was successful and your subscription is now active.";
          }

          return "Your payment was not completed.";
        })()}
      </p>

      {/* Деталі підписки / платежу, якщо є */}
      {subscriptionDetails && (
        <div
          style={{
            textAlign: "left",
            marginTop: 16,
            marginBottom: 24,
            padding: 16,
            borderRadius: 8,
            background:
              "linear-gradient(135deg, rgba(0,186,206,0.12), rgba(0,186,206,0.04))",
            border: "1px solid rgba(0,186,206,0.3)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
            Subscription details
          </div>
          <div style={{ fontSize: 13, color: "var(--text)" }}>
            {subscriptionDetails.plan_name && (
              <div style={{ marginBottom: 4 }}>
                <strong>Plan:</strong> {subscriptionDetails.plan_name}
              </div>
            )}
            {(subscriptionDetails.amount || subscriptionDetails.amount_total) && (
              <div style={{ marginBottom: 4 }}>
                <strong>Quantity:</strong>{" "}
                {(() => {
                  const amount =
                    subscriptionDetails.amount ??
                    subscriptionDetails.amount_total;
                  // Якщо це кількість, не ділимо на 100 і не додаємо валюту
                  return typeof amount === "number" ? amount : amount;
                })()}
              </div>
            )}
            {subscriptionDetails.payment_type && (
              <div style={{ marginBottom: 4 }}>
                <strong>Payment type:</strong>{" "}
                {subscriptionDetails.payment_type}
              </div>
            )}
            {(subscriptionDetails.status || paymentStatus) && (
              <div style={{ marginBottom: 4 }}>
                <strong>Status:</strong>{" "}
                {subscriptionDetails.status || paymentStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next steps */}
      {displayNextSteps.length > 0 && (
        <div
          style={{
            textAlign: "left",
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
            Next steps
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              display: "grid",
              gap: 4,
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            {displayNextSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Кнопки дій */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button className="btn primary" onClick={handleGoToSubscription}>
          Go to my subscription
        </button>
        <button className="btn outline" onClick={handleReturnToPlans}>
          Return to plans
        </button>
        <button className="btn ghost" onClick={handleSupport}>
          Support
        </button>
      </div>
    </div>
  );
}

