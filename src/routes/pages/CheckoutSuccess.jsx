import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PaymentApi } from "../../api/paymentApi.js";
import { SubscriptionApi } from "../../api/subscriptionApi.js";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { useAuth } from "../../api/AuthContext.jsx";

/**
 * Checkout Success Page
 * Handles successful return from Stripe Checkout
 * Verifies the session and updates subscription status
 */
export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const { refreshAuth } = useAuth();
  const [status, setStatus] = React.useState("verifying");
  const [subscription, setSubscription] = React.useState(null);
  
  // Захист від повторних викликів API
  const hasVerifiedRef = React.useRef(false);
  const sessionIdRef = React.useRef(null);

  React.useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    // Якщо sessionId не змінився і вже був виклик - не викликаємо знову
    if (hasVerifiedRef.current && sessionIdRef.current === sessionId) {
      console.log('⚠️ CheckoutSuccess: Already verified this session, skipping duplicate call');
      return;
    }
    
    // Якщо немає sessionId - обробляємо помилку тільки один раз
    if (!sessionId) {
      if (hasVerifiedRef.current) return; // Вже обробили
      hasVerifiedRef.current = true;
      setStatus("error");
      showNotification("No session ID found", "error");
      setTimeout(() => navigate("/dashboard/subscriptions"), 3000);
      return;
    }

    // Позначаємо, що починаємо верифікацію для цього sessionId
    hasVerifiedRef.current = true;
    sessionIdRef.current = sessionId;

    const verifySession = async () => {
      try {
        setStatus("verifying");
        
        console.log('🔍 CheckoutSuccess: Verifying session:', sessionId);
        
        // Verify the session with backend
        const sessionResult = await PaymentApi.checkoutSuccess(sessionId);
        
        console.log('✅ CheckoutSuccess: Session verified:', sessionResult);
        
        if (sessionResult && sessionResult.success !== false) {
          // Get updated subscription info
          try {
            const subscriptionData = await SubscriptionApi.getMySubscription();
            console.log('📊 CheckoutSuccess: Subscription data (raw):', subscriptionData);
            
            // Нова структура API: { result: { subscription: {...}, usage: {...}, plan_features: {...} } }
            const subscription = subscriptionData?.result?.subscription || 
                                 subscriptionData?.result || 
                                 subscriptionData?.subscription ||
                                 subscriptionData;
            
            console.log('📊 CheckoutSuccess: Subscription (extracted):', subscription);
            setSubscription(subscription);
            
            // Refresh user data to get updated plan
            if (refreshAuth) {
              await refreshAuth();
            }
            
            setStatus("success");
            showNotification("Subscription activated successfully! 🎉", "success");
            
            // Redirect to subscriptions page after 3 seconds
            setTimeout(() => {
              navigate("/dashboard/subscriptions");
            }, 3000);
          } catch (subError) {
            console.error("Failed to load subscription:", subError);
            // Still show success if session was verified
            setStatus("success");
            showNotification("Payment successful! Updating subscription...", "success");
            setTimeout(() => {
              navigate("/dashboard/subscriptions");
            }, 3000);
          }
        } else {
          throw new Error(sessionResult?.error || "Session verification failed");
        }
      } catch (error) {
        console.error("Checkout verification failed:", error);
        setStatus("error");
        showNotification(
          error.message || "Failed to verify payment. Please contact support if payment was processed.",
          "error"
        );
        setTimeout(() => {
          navigate("/dashboard/subscriptions");
        }, 5000);
      }
    };

    verifySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Використовуємо тільки searchParams як залежність

  if (status === "verifying") {
    return (
      <div className="card" style={{ 
        maxWidth: 600, 
        margin: "40px auto", 
        padding: 40,
        textAlign: "center" 
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ marginBottom: 12 }}>Verifying Payment...</h2>
        <p style={{ color: "var(--muted)" }}>
          Please wait while we confirm your subscription.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card" style={{ 
        maxWidth: 600, 
        margin: "40px auto", 
        padding: 40,
        textAlign: "center" 
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <h2 style={{ marginBottom: 12 }}>Verification Failed</h2>
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>
          We couldn't verify your payment. If you were charged, please contact support.
        </p>
        <button 
          className="btn primary" 
          onClick={() => navigate("/dashboard/subscriptions")}
        >
          Go to Subscriptions
        </button>
      </div>
    );
  }

  // Success state
  return (
    <div className="card" style={{ 
      maxWidth: 600, 
      margin: "40px auto", 
      padding: 40,
      textAlign: "center" 
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ marginBottom: 12 }}>Payment Successful!</h2>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        Your subscription has been activated. You now have access to all premium features.
      </p>
      
      {subscription && (() => {
        // Отримуємо назву плану з різних можливих місць в response
        const planName = subscription.plan_name?.charAt(0).toUpperCase() + subscription.plan_name?.slice(1) ||
                         subscription.plan_tier?.charAt(0).toUpperCase() + subscription.plan_tier?.slice(1) ||
                         subscription.subscription_details?.plan_name ||
                         subscription.current_plan?.charAt(0).toUpperCase() + subscription.current_plan?.slice(1) ||
                         subscription.plan?.name ||
                         "Premium";
        
        // Отримуємо дату наступного платежу
        const nextBilling = subscription.next_billing_date ||
                            subscription.next_billing ||
                            subscription.subscription?.next_billing_date ||
                            subscription.billing_date;
        
        return (
          <div style={{ 
            padding: 16, 
            background: "rgba(0, 186, 206, 0.1)", 
            borderRadius: 8,
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Your Plan:</div>
            <div style={{ fontSize: 18, color: "var(--primary)", fontWeight: 600 }}>
              {planName}
            </div>
            {nextBilling && (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Next billing: {new Date(nextBilling).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      })()}
      
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
          View Subscription
        </button>
      </div>
      
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 24 }}>
        Redirecting to subscriptions page in a few seconds...
      </p>
    </div>
  );
}

