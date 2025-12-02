import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { PaymentApi } from "../../api/paymentApi.js";

/**
 * Checkout Cancel Page
 * Handles cancellation from Stripe Checkout
 */
export default function CheckoutCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [status, setStatus] = React.useState("loading"); // loading | success | error | no-session
  const [result, setResult] = React.useState(null);

  // Захист від повторних викликів API для того ж session_id
  const hasHandledRef = React.useRef(false);
  const sessionIdRef = React.useRef(null);

  React.useEffect(() => {
    const sessionId = searchParams.get("session_id");

    // Якщо цей session_id ми вже обробляли — не дублюємо запит
    if (hasHandledRef.current && sessionIdRef.current === sessionId) {
      return;
    }

    // Якщо session_id відсутній — не робимо запит, але показуємо сторінку
    if (!sessionId) {
      hasHandledRef.current = true;
      sessionIdRef.current = null;
      setStatus("no-session");
      showNotification("Payment was cancelled. No charges were made.", "info");
      return;
    }

    hasHandledRef.current = true;
    sessionIdRef.current = sessionId;

    const handleCancel = async () => {
      try {
        setStatus("loading");

        console.log("🔎 Processing Stripe checkout cancel for session_id:", sessionId);

        const response = await PaymentApi.checkoutCancel(sessionId);
        console.log("✅ Checkout cancel response:", response);

        setResult(response || null);

        const success = response?.success !== false;
        const cancelled = response?.cancelled === true;

        const message =
          response?.message ||
          (cancelled
            ? "Payment was successfully cancelled."
            : "Checkout was cancelled. No charges were made.");

        showNotification(message, success ? "info" : "warning");
        setStatus("success");
      } catch (error) {
        console.error("❌ Failed to process checkout cancellation:", error);
        setStatus("error");
        showNotification(
          error?.message ||
            "Failed to process payment cancellation. You can try again or contact support.",
          "error"
        );
      }
    };

    handleCancel();
  }, [searchParams, showNotification]);

  // Підготовка даних для відображення
  const sessionDetails = React.useMemo(() => {
    if (!result) return null;
    return (
      result.session_details ||
      result.session ||
      result.details ||
      result.result?.session_details ||
      null
    );
  }, [result]);

  const nextSteps = result?.next_steps || [];
  const retryOptions = result?.retry_options || {};
  const canRetry = retryOptions?.can_retry !== false;

  const handleRetry = () => {
    // Для повторної оплати повертаємо користувача до вибору плану (Upgrade таб)
    navigate("/dashboard/subscriptions?tab=upgrade");
  };

  const handleReturnToPlans = () => {
    navigate("/dashboard/subscriptions?tab=upgrade");
  };

  const handleSupport = () => {
    // Ведемо користувача на сторінку Help Center (узгоджено зі структурою проєкту)
    navigate("/dashboard/help-center");
  };

  const isLoading = status === "loading";

  return (
    <div className="card" style={{ 
      maxWidth: 600, 
      margin: "40px auto", 
      padding: 40,
      textAlign: "center" 
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
      <h2 style={{ marginBottom: 12 }}>
        {isLoading ? "Processing cancellation..." : "Payment Cancelled"}
      </h2>

      {/* Основне повідомлення */}
      <p style={{ color: "var(--muted)", marginBottom: 16 }}>
        {(() => {
          if (isLoading) {
            return "Please wait while we confirm the cancellation with the payment provider.";
          }

          if (status === "error") {
            return "We couldn't fully process the cancellation details, but your payment will not be completed.";
          }

          const baseMessage =
            result?.message || "Your payment was cancelled. No charges were made to your account.";
          const reasonText = result?.reason ? ` ${result.reason}` : "";

          return `${baseMessage}${reasonText}`;
        })()}
      </p>

      {/* Деталі сесії, якщо вони є */}
      {sessionDetails && (
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
            Session details
          </div>
          <div style={{ fontSize: 13, color: "var(--text)" }}>
            {sessionDetails.plan_name && (
              <div style={{ marginBottom: 4 }}>
                <strong>Plan:</strong> {sessionDetails.plan_name}
              </div>
            )}
            {(sessionDetails.amount || sessionDetails.amount_total) && (
              <div style={{ marginBottom: 4 }}>
                <strong>Amount:</strong>{" "}
                {(() => {
                  const amount =
                    sessionDetails.amount_total ?? sessionDetails.amount;
                  const currency =
                    (sessionDetails.currency || "usd").toUpperCase();
                  // Stripe суми зазвичай у мінімальних одиницях (центи)
                  const normalized = typeof amount === "number"
                    ? (amount / 100).toFixed(2)
                    : amount;
                  return `${normalized} ${currency}`;
                })()}
              </div>
            )}
            {sessionDetails.payment_type && (
              <div style={{ marginBottom: 4 }}>
                <strong>Payment type:</strong> {sessionDetails.payment_type}
              </div>
            )}
            {sessionDetails.status && (
              <div style={{ marginBottom: 4 }}>
                <strong>Status:</strong> {sessionDetails.status}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Наступні кроки */}
      {nextSteps.length > 0 && (
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
            {nextSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Рекомендації щодо повторної спроби */}
      {retryOptions?.suggested_actions?.length > 0 && (
        <div
          style={{
            textAlign: "left",
            marginBottom: 24,
            padding: 12,
            borderRadius: 8,
            background: "rgba(249, 250, 251, 0.4)",
            border: "1px dashed var(--border)",
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Retry options
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {retryOptions.suggested_actions.map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button 
          className="btn outline" 
          onClick={handleReturnToPlans}
        >
          Return to plans
        </button>
        {canRetry && (
          <button 
            className="btn primary" 
            onClick={handleRetry}
            disabled={isLoading}
          >
            Try payment again
          </button>
        )}
        <button
          className="btn ghost"
          onClick={handleSupport}
        >
          Support
        </button>
      </div>
    </div>
  );
}

