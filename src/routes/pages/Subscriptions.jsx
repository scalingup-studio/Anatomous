import React from "react";
import { useSearchParams } from "react-router-dom";
import { UpgradePrompt } from "../../components/UpgradePrompt.jsx";
import { Modal } from "../../components/Modal.jsx";
import { useAuth } from "../../api/AuthContext.jsx";
import { SubscriptionApi } from "../../api/subscriptionApi.js";
import { PaymentApi } from "../../api/paymentApi.js";
import { useNotifications } from "../../api/NotificationContext.jsx";
import { PLAN_TIERS, getUserPlan } from "../../utils/subscriptionUtils.js";
import DatePicker from "../../components/DatePicker.jsx";

function Tabs({ value, onChange }) {
  const items = [
    { key: "current", label: "Current Plan" },
    { key: "upgrade", label: "Upgrade Options" },
    { key: "history", label: "Payment History" },
  ];
  return (
    <div role="tablist" aria-label="Subscriptions navigation" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 16 }}>
      {items.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          role="tab"
          aria-selected={value === t.key}
          style={{
            padding: "8px 16px",
            border: "none",
            background: "transparent",
            color: value === t.key ? "var(--primary)" : "var(--muted)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: value === t.key ? 600 : 400,
            borderBottom: value === t.key ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function SubscriptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Читаємо таб з URL, якщо є, інакше "current" за замовчуванням
  const tabFromUrl = searchParams.get("tab");
  const validTabs = ["current", "upgrade", "history"];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "current";
  
  const [tab, setTab] = React.useState(initialTab);
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  // Синхронізуємо таб з URL при зміні
  const handleTabChange = (newTab) => {
    setTab(newTab);
    // Оновлюємо URL без перезавантаження сторінки
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", newTab);
    // Використовуємо setSearchParams для оновлення query параметрів
    setSearchParams(newSearchParams, { replace: true });
  };
  
  // Синхронізуємо таб з URL при зміні searchParams (наприклад, при прямому переході)
  React.useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && validTabs.includes(tabFromUrl) && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  const handleUpgradeSuccess = () => {
    setRefreshKey(prev => prev + 1);
    handleTabChange("current");
    // Оновлюємо дані підписки після успішного upgrade
    // Це спрацює через key={refreshKey} на CurrentPlan компоненті
  };
  
  // Callback для оновлення підписки після upgrade (передається в UpgradeOptions)
  const handleSubscriptionUpdate = React.useCallback(() => {
    // Оновлюємо refreshKey, щоб перезавантажити CurrentPlan
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="dash-toolbar">
        <h1 style={{ margin: 0 }}>Subscriptions</h1>
      </div>

      {/* Helpful banner */}
      <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ color:'var(--muted)', fontSize:13 }}>Manage your current plan, see what’s included, and upgrade at any time. You can also switch between monthly and annual billing in the Upgrade tab.</div>
        <a className="btn ghost" href="/privacy" target="_blank" rel="noreferrer">Billing FAQ</a>
      </div>

      <Tabs value={tab} onChange={handleTabChange} />

      {tab === "current" && <CurrentPlan key={refreshKey} />}
      {tab === "upgrade" && <UpgradeOptions onUpgradeSuccess={handleUpgradeSuccess} onSubscriptionUpdate={handleSubscriptionUpdate} />}
      {tab === "history" && <PaymentHistory />}
    </div>
  );
}

function Badge({ children, tone = "secondary" }) {
  return (
    <span className={`btn ${tone} small`} style={{ pointerEvents:'none' }}>{children}</span>
  );
}

function CurrentPlan() {
  const { user, refreshAuth, setUser } = useAuth();
  const { showNotification } = useNotifications();
  const [subscription, setSubscription] = React.useState(null);
  const [allPlans, setAllPlans] = React.useState([]); // Store all plans from API
  const [loading, setLoading] = React.useState(true);
  const [upgradePromptOpen, setUpgradePromptOpen] = React.useState(false);
  const [upgradeFeature, setUpgradeFeature] = React.useState(null);
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [cancelImmediate, setCancelImmediate] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelLoading, setCancelLoading] = React.useState(false);
  const [familyModalOpen, setFamilyModalOpen] = React.useState(false);
  const [familySaving, setFamilySaving] = React.useState(false);
  const [familyForm, setFamilyForm] = React.useState({
    family_member_name: "",
    first_name: "",
    last_name: "",
    dob: "",
    sex_of_birth: "",
    height_cm: 0,
    weight_kg: 0,
    height_type: "",
    weight_type: "",
    role: "member",
    access_level: "full",
  });
  const [familyHeightUnit, setFamilyHeightUnit] = React.useState('in');
  const [familyWeightUnit, setFamilyWeightUnit] = React.useState('lb');
  const [familyMembersData, setFamilyMembersData] = React.useState(null);

  const loadSubscription = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await SubscriptionApi.getMySubscription();
      
      // Нова структура API: { result: { subscription: {...}, usage: {...}, plan_features: {...} } }
      // Стара структура: { result: { subscription: {...} } } або { subscription: {...} }
      const subscriptionData = data?.result?.subscription || 
                                data?.result || 
                                data?.subscription ||
                                data;
      
      // Зберігаємо також usage та plan_features з result
      const usageData = data?.result?.usage || null;
      const planFeaturesData = data?.result?.plan_features || null;
      
      // Додаємо usage та plan_features до subscription об'єкта для зручності
      if (subscriptionData) {
        subscriptionData.usage = usageData || subscriptionData.usage;
        subscriptionData.plan_features = planFeaturesData || subscriptionData.plan_features;
      }

      setSubscription(subscriptionData);

      // Синхронізуємо актуальний план у AuthContext.user,
      // щоб feature‑gating (hasFeatureAccess) одразу бачив Core/Complete/Family.
      if (subscriptionData && typeof setUser === "function") {
        setUser((prev) => {
          const nextPlan =
            subscriptionData.plan_tier ||
            subscriptionData.plan_name ||
            subscriptionData.subscription_plan ||
            prev?.subscription_plan;

          return {
            ...prev,
            subscription_plan: nextPlan,
            plan_tier: subscriptionData.plan_tier || prev?.plan_tier,
            plan_name: subscriptionData.plan_name || prev?.plan_name,
            subscription_status: subscriptionData.status || prev?.subscription_status,
          };
        });
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
      
      // Якщо помилка 500 з повідомленням про відсутні поля - показуємо попередження
      // але не блокуємо UI, використовуємо fallback дані
      if (error.status === 500 && error.message?.includes('Unable to locate var')) {
        console.warn("Backend subscription API has missing fields. Using fallback data.");
        showNotification(
          "Some subscription details are unavailable. Please contact support if this persists.",
          "warning"
        );
        // Встановлюємо null, щоб використати fallback дані з useMemo
        setSubscription(null);
      } else {
        // Для інших помилок показуємо повідомлення
        showNotification(
          error.message || "Failed to load subscription data. Using default plan information.",
          "error"
        );
        // Встановлюємо null для fallback
        setSubscription(null);
      }
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Load family members data to check max_members and itemsTotal
  const loadFamilyMembersData = React.useCallback(async () => {
    try {
      const res = await SubscriptionApi.getFamilyMembers({ 
        status: "active", 
        include_profiles: true, 
        per_page: 20 
      });
      const base = res?.result || res || {};
      
      // Обчислюємо itemsTotal - пріоритет масиву items
      let itemsTotal = 0;
      if (base.itemsTotal !== undefined && base.itemsTotal !== null) {
        // Якщо itemsTotal вказано явно, використовуємо його (найточніше)
        itemsTotal = base.itemsTotal;
      } else if (Array.isArray(base.items)) {
        // Якщо є масив items, використовуємо його довжину
        itemsTotal = base.items.length;
      } else if (Array.isArray(base)) {
        // Якщо сам base є масивом
        itemsTotal = base.length;
      }
      
      // max_members може бути в family_info або в корені
      const maxMembers = base.family_info?.max_members || base.max_members || null;
      
      const data = {
        max_members: maxMembers,
        itemsTotal: itemsTotal
      };
      
      // Логування для діагностики
      console.log('Family members data loaded:', {
        max_members: data.max_members,
        itemsTotal: data.itemsTotal,
        itemsLength: Array.isArray(base.items) ? base.items.length : 'N/A',
        family_info: base.family_info,
        rawResponse: base
      });
      
      setFamilyMembersData(data);
    } catch (err) {
      console.error("Failed to load family members data:", err);
      setFamilyMembersData(null);
    }
  }, []);

  // Load plans to get features
  const loadPlans = React.useCallback(async () => {
    try {
      const response = await SubscriptionApi.getPlans();
      const plansData = response?.result || response || [];
      setAllPlans(plansData);
    } catch (error) {
      console.error("Failed to load plans:", error);
      // Не критично, продовжуємо без планів
    }
  }, []);

  React.useEffect(() => {
    loadSubscription();
    loadPlans();
    loadFamilyMembersData();
  }, [loadSubscription, loadPlans, loadFamilyMembersData]);

  // Оновлюємо дані при фокусі на вкладці (якщо користувач повернувся на цю вкладку)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Перезавантажуємо дані, коли сторінка стає видимою
        loadSubscription();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadSubscription]);


  // Format subscription data for display
  const active = React.useMemo(() => {
    if (!subscription) {
      return {
        name: "Free",
        tier: "Active",
        renewal: null,
        status: "free",
        willCancelAt: null,
        limits: { 
          familyUsed: 0, 
          familyMax: 0, 
          uploadsUsed: 0, 
          uploadsMax: 0, 
          goalsUsed: 0, 
          goalsMax: 0, 
          notesUsed: 0, 
          notesMax: 0,
          aiMessagesUsed: 0,
          aiMessagesLimit: 10
        },
        features: [
          "Manual Health Data Entry",
          "10 AI Messages/month",
          "Secure Data Backup",
        ],
      };
    }

    // Отримуємо назву плану з різних можливих місць в response
    // API повертає plan_name та plan_tier в subscription об'єкті
    const planName = subscription.plan_name?.charAt(0).toUpperCase() + subscription.plan_name?.slice(1) ||
                     subscription.plan_tier?.charAt(0).toUpperCase() + subscription.plan_tier?.slice(1) ||
                     subscription.subscription_details?.plan_name || 
                     subscription.current_plan?.charAt(0).toUpperCase() + subscription.current_plan?.slice(1) || 
                     subscription.plan?.name ||
                     "Free";
    
    // Отримуємо usage дані - нова структура: data.result.usage
    // Формат: { ai_messages: { enabled, current_value, max_value, feature_name }, ... }
    const usage = subscription.usage || {};
    
    // Конвертуємо новий формат usage в старий формат для сумісності
    // Зберігаємо також інформацію про enabled та feature_name
    const normalizedUsage = {};
    const usageMetadata = {}; // Зберігаємо метадані для кожного usage item
    
    if (usage && typeof usage === 'object') {
      // Новий формат: { ai_messages: { enabled, current_value, max_value, feature_name }, ... }
      Object.keys(usage).forEach(key => {
        const usageItem = usage[key];
        if (usageItem && typeof usageItem === 'object' && usageItem.enabled === true) {
          // Мапимо ключі тільки якщо enabled === true
          if (key === 'ai_messages') {
            normalizedUsage.ai_messages_used = usageItem.current_value || 0;
            normalizedUsage.ai_messages_limit = usageItem.max_value || 0;
            usageMetadata.ai_messages = {
              enabled: true,
              feature_name: usageItem.feature_name || 'AI Messages',
              current_value: usageItem.current_value || 0,
              max_value: usageItem.max_value || 0
            };
          } else if (key === 'pdf_reports') {
            normalizedUsage.uploads_used = usageItem.current_value || 0;
            normalizedUsage.uploads_limit = usageItem.max_value || 0;
            usageMetadata.pdf_reports = {
              enabled: true,
              feature_name: usageItem.feature_name || 'Reports (PDF Export)',
              current_value: usageItem.current_value || 0,
              max_value: usageItem.max_value || 0
            };
          } else if (key === 'csv_export') {
            usageMetadata.csv_export = {
              enabled: true,
              feature_name: usageItem.feature_name || 'CSV Data Export',
              current_value: usageItem.current_value || 0,
              max_value: usageItem.max_value || 0
            };
          }
        }
      });
    }
    
    // Отримуємо subscription_plan_id для пошуку плану
    const subscriptionPlanId = subscription.subscription_plan_id ||
                                subscription.subscription_details?.subscription_plan_id ||
                                subscription.plan_id ||
                                null;
    
    // Знаходимо план з API /plans, який відповідає поточній підписці
    let currentPlanFromApi = null;
    if (subscriptionPlanId && allPlans.length > 0) {
      currentPlanFromApi = allPlans.find(plan => plan.id === subscriptionPlanId || String(plan.id) === String(subscriptionPlanId));
    }
    
    // Якщо не знайдено за ID, пробуємо знайти за plan_name або plan_tier
    if (!currentPlanFromApi && allPlans.length > 0) {
      const planName = subscription.plan_name || subscription.plan_tier;
      if (planName) {
        currentPlanFromApi = allPlans.find(plan => 
          plan.plan_tier?.toLowerCase() === planName.toLowerCase() ||
          plan.name?.toLowerCase() === planName.toLowerCase()
        );
      }
    }
    
    // Отримуємо features з плану з API /plans або з plan_features з API /my_subscription
    let features = [];
    
    // Спочатку пробуємо використати plan_features з API /my_subscription (нова структура)
    const planFeatures = subscription.plan_features || {};
    if (Object.keys(planFeatures).length > 0) {
      // Форматуємо plan_features в список features
      const featureNames = [];
      
      if (planFeatures.manual_data_entry) featureNames.push("Manual Health Data Entry");
      if (planFeatures.ai_messages) {
        // Перевіряємо ліміт з subscription
        const aiLimit = subscription.ai_messages_limit;
        if (aiLimit === 0 || aiLimit === -1) {
          featureNames.push("Unlimited AI Messages/month");
        } else if (aiLimit > 0) {
          featureNames.push(`${aiLimit} AI Messages/month`);
        } else {
          featureNames.push("AI Messages");
        }
      }
      if (planFeatures.ai_risk_forecasts) featureNames.push("AI-Driven Risk Forecasts");
      if (planFeatures.early_alerts) featureNames.push("Early Alerts");
      if (planFeatures.pdf_reports) featureNames.push("Reports (PDF Export)");
      if (planFeatures.csv_export) featureNames.push("CSV Data Export");
      if (planFeatures.document_uploads) {
        const uploadLimit = subscription.file_uploads_limit;
        if (uploadLimit === 0 || uploadLimit === -1) {
          featureNames.push("Unlimited Document Uploads");
        } else if (uploadLimit > 0) {
          featureNames.push(`${uploadLimit} Document Uploads/month`);
        } else {
          featureNames.push("Document Uploads");
        }
      }
      if (planFeatures.custom_goals) {
        const goalsLimit = subscription.goals_limit;
        if (goalsLimit === 0 || goalsLimit === -1) {
          featureNames.push("Unlimited Custom Goals");
        } else if (goalsLimit > 0) {
          featureNames.push(`Up to ${goalsLimit} Custom Goals`);
        } else {
          featureNames.push("Custom Goals");
        }
      }
      if (planFeatures.goal_history) featureNames.push("Goal History");
      if (planFeatures.notes) {
        const notesLimit = subscription.notes_limit;
        if (notesLimit === 0 || notesLimit === -1) {
          featureNames.push("Unlimited Notes");
        } else if (notesLimit > 0) {
          featureNames.push(`Up to ${notesLimit} Notes`);
        } else {
          featureNames.push("Notes");
        }
      }
      if (planFeatures.chat_history) featureNames.push("Chat History Access");
      if (planFeatures.provider_sharing) featureNames.push("Share with Providers");
      if (planFeatures.family_sharing) {
        const familyLimit = subscription.max_members || 1;
        featureNames.push(`Family Sharing (${familyLimit} linked user${familyLimit > 1 ? 's' : ''})`);
      }
      if (planFeatures.secure_data_backup) featureNames.push("Secure Data Backup");
      
      features = featureNames;
    } else if (currentPlanFromApi?.features) {
      // Fallback: використовуємо features з плану з API /plans
      // Форматуємо features з плану
      features = currentPlanFromApi.features.map(feature => {
        const featureName = feature.feature_name || feature.feature;
        const limitValue = feature.limit_value;
        const isLimited = feature.is_limited;
        const featureKey = feature.feature_key;
        
        // Якщо не обмежено або ліміт 0, просто повертаємо назву
        if (!isLimited || limitValue === 0) {
          return featureName;
        }
        
        // Якщо unlimited (-1)
        if (limitValue === -1) {
          if (featureKey === 'ai_messages') {
            return 'Unlimited AI Messages/month';
          } else if (featureKey === 'document_uploads') {
            return 'Unlimited Document Uploads';
          } else if (featureKey === 'notes') {
            return 'Unlimited Notes';
          } else if (featureKey === 'custom_goals') {
            return 'Unlimited Custom Goals';
          } else if (featureKey === 'goal_history') {
            return 'Unlimited Goal History';
          } else if (featureKey === 'chat_history') {
            return 'Full Chat History';
          }
          return featureName;
        }
        
        // Якщо обмежено з конкретним значенням
        if (limitValue > 0) {
          if (featureKey === 'ai_messages') {
            return `${limitValue} AI Messages/month`;
          } else if (featureKey === 'document_uploads') {
            return `${limitValue} Document Uploads/month`;
          } else if (featureKey === 'notes') {
            return `Up to ${limitValue} Notes`;
          } else if (featureKey === 'custom_goals') {
            return `Up to ${limitValue} Custom Goals`;
          } else if (featureKey === 'goal_history') {
            return `${limitValue}-day Goal History`;
          } else if (featureKey === 'chat_history') {
            return `${limitValue}-day Chat History`;
          } else if (featureKey === 'family_sharing') {
            return `Family Sharing (${limitValue} linked user${limitValue > 1 ? 's' : ''})`;
          }
        }
        
        return featureName;
      });
    } else {
      // Fallback: використовуємо features з subscription, якщо план не знайдено
      const fallbackFeatures = subscription.available_features || 
                                subscription.features || 
                                subscription.plan?.features || 
                                [];
      
      // Мапимо fallback features до читабельного формату
      features = fallbackFeatures.map(f => {
        const featureMap = {
          ai_message: "AI Messages",
          upload: "Document Uploads",
          create_note: "Create Notes",
          view_notes: "View Notes",
          ai_risk_forecast: "AI Risk Forecasts",
          goal_history: "Goal History",
          custom_goal: "Custom Goals",
          family_sharing: "Family Sharing",
        };
        return featureMap[f] || f;
      });
      
      console.warn('⚠️ Plan not found in /plans API, using fallback features from subscription');
    }
    
    // Отримуємо статус підписки
    const status = subscription.status ||
                   subscription.subscription_status || 
                   subscription.subscription?.status || 
                   "active";
    
    // Отримуємо дату наступного платежу
    const nextBilling = subscription.next_billing_date || 
                        subscription.next_billing || 
                        subscription.subscription?.next_billing_date ||
                        subscription.billing_date;

    // Дата запланованого скасування (якщо підписка буде скасована в кінці періоду)
    const willCancelAtRaw = subscription.will_cancel_at ||
                            subscription.cancel_at ||
                            subscription.cancel_at_period_end_date ||
                            subscription.cancel_at_period_end ||
                            null;

    const willCancelAt = willCancelAtRaw ? new Date(willCancelAtRaw).toLocaleDateString() : null;

    // Отримуємо family members дані, якщо є
    const familyData = subscription.family_members || subscription.family || {};
    const familyUsed = familyData.used || familyData.active_count || 0;
    const familyMax = familyData.limit || familyData.max || 0;

    // Людське відображення статусу
    let tierLabel;
    if (status === "cancelled") {
      tierLabel = "Cancelled";
    } else if (willCancelAt) {
      tierLabel = "Pending Cancellation";
    } else if (status === "active") {
      tierLabel = "Active";
    } else {
      tierLabel = status.charAt(0).toUpperCase() + status.slice(1);
    }

    return {
      name: planName,
      tier: tierLabel,
      status,
      renewal: !willCancelAt && nextBilling 
        ? new Date(nextBilling).toLocaleDateString()
        : null,
      willCancelAt,
            limits: {
              familyUsed: familyUsed,
              familyMax: familyMax,
              uploadsUsed: normalizedUsage.uploads_used ?? usage.uploads_used ?? usage.upload_used ?? 0,
              uploadsMax: normalizedUsage.uploads_limit ?? usage.uploads_limit ?? usage.upload_limit ?? 0,
              goalsUsed: usage.goals_used ?? usage.goal_used ?? 0,
              goalsMax: usage.goals_limit ?? usage.goal_limit ?? 0,
              notesUsed: usage.notes_used ?? usage.note_used ?? 0,
              notesMax: usage.notes_limit ?? usage.note_limit ?? 0,
              aiMessagesUsed: normalizedUsage.ai_messages_used ?? usage.ai_messages_used ?? usage.ai_message_used ?? 0,
              aiMessagesLimit: normalizedUsage.ai_messages_limit ?? usage.ai_messages_limit ?? usage.ai_message_limit ?? 10, // Default fallback
            },
      features: features, // Features вже відформатовані з API /plans
      // Додаткова інформація для відображення
      rawData: subscription, // Зберігаємо raw дані для debugging
      usageMetadata: usageMetadata, // Метадані usage для відображення в Active limits
    };
  }, [subscription, allPlans]);

  const canCancelSubscription = React.useMemo(() => {
    // Можна скасувати тільки якщо є активна платна підписка без запланованого скасування
    if (!subscription) return false;
    if (active.status === "cancelled") return false;
    if (active.willCancelAt) return false;
    // Free план (fallback коли немає subscription) вже відфільтрований вище
    return true;
  }, [subscription, active.status, active.willCancelAt]);

  const isFamilyPlan = React.useMemo(() => {
    const plan = getUserPlan(user);
    return plan === PLAN_TIERS.FAMILY;
  }, [user]);

  const handleFamilyInputChange = (field, value) => {
    setFamilyForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateFamilyMember = async (e) => {
    e?.preventDefault?.();
    if (!familyForm.family_member_name && !familyForm.first_name) {
      showNotification("Please enter at least a name or nickname for the family member.", "error");
      return;
    }

    try {
      setFamilySaving(true);

      const payload = {
        name: "Second",
        family_member_name: familyForm.family_member_name || `${familyForm.first_name} ${familyForm.last_name}`.trim(),
        first_name: familyForm.first_name || null,
        last_name: familyForm.last_name || null,
        dob: familyForm.dob || null,
        sex_of_birth: familyForm.sex_of_birth || null,
        height_cm: Number(familyForm.height_cm) || 0,
        weight_kg: Number(familyForm.weight_kg) || 0,
        height_type: familyHeightUnit || "",
        weight_type: familyWeightUnit || "",
        role: familyForm.role || "member",
        access_level: familyForm.access_level || "full",
      };

      const res = await SubscriptionApi.addFamilyMember(payload);
      showNotification("Family member profile created.", "success");

      // Refresh subscription limits (familyUsed/familyMax, etc.)
      await loadSubscription();
      // Refresh family members data to update max_members and itemsTotal
      await loadFamilyMembersData();
      
      // Додаткова затримка для оновлення UI
      setTimeout(async () => {
        await loadFamilyMembersData();
        // Перевіряємо, чи досягнуто максимум, і якщо так - перезавантажуємо сторінку
        const updatedData = await SubscriptionApi.getFamilyMembers({ 
          status: "active", 
          include_profiles: true, 
          per_page: 20 
        });
        const base = updatedData?.result || updatedData || {};
        let itemsTotal = 0;
        if (Array.isArray(base.items)) {
          itemsTotal = base.items.length;
        } else if (base.itemsTotal !== undefined && base.itemsTotal !== null) {
          itemsTotal = base.itemsTotal;
        }
        const maxMembers = base.max_members;
        
        if (maxMembers && itemsTotal >= maxMembers) {
          // Якщо досягнуто максимум, перезавантажуємо сторінку для оновлення UI
          window.location.reload();
        }
      }, 1000);

      setFamilyModalOpen(false);
      setFamilyForm({
        family_member_name: "",
        first_name: "",
        last_name: "",
        dob: "",
        sex_of_birth: "",
        height_cm: 0,
        weight_kg: 0,
        height_type: "",
        weight_type: "",
        role: "member",
        access_level: "full",
      });
      setFamilyHeightUnit('in');
      setFamilyWeightUnit('lb');
    } catch (error) {
      console.error("Failed to create family member:", error);
      showNotification(
        error?.message || "Failed to create family member profile. Please try again.",
        "error"
      );
    } finally {
      setFamilySaving(false);
    }
  };

  const handleCancelSubscription = React.useCallback(async () => {
    try {
      setCancelLoading(true);

      const payload = {
        immediate: !!cancelImmediate,
        reason: cancelReason.trim() ? cancelReason.trim() : null,
      };

      const response = await PaymentApi.cancelSubscription(payload);

      const success = response?.success !== false;
      const backendMessage =
        response?.message ||
        (success ? "Subscription cancelled successfully." : "Failed to cancel subscription.");

      if (!success) {
        const backendError =
          response?.error ||
          response?.detail ||
          response?.message ||
          "Failed to cancel subscription.";
        throw new Error(backendError);
      }

      // Показуємо повідомлення від бекенду
      showNotification(backendMessage, "success");

      // Оновлений об'єкт підписки може прийти в різних полях
      const updatedSubscription =
        response?.subscription ||
        response?.result?.subscription ||
        response?.result ||
        null;

      // Якщо користувач обрав негайне скасування — одразу перемикаємо на Free план
      if (payload.immediate) {
        setSubscription(null);
        // Оновлюємо план у AuthContext.user → Starter / Free
        if (typeof setUser === "function") {
          setUser((prev) => ({
            ...prev,
            subscription_plan: "starter",
            plan_tier: "starter",
            plan_name: "Free",
            subscription_status: "cancelled",
          }));
        }
      } else if (updatedSubscription) {
        // Якщо скасування в кінці періоду — оновлюємо локальні дані підписки,
        // щоб показати статус "Очікує скасування" та дату will_cancel_at
        setSubscription(updatedSubscription);

        // Для скасування в кінці періоду залишаємо поточний платний план,
        // але оновлюємо статус / will_cancel_at якщо потрібно.
        if (typeof setUser === "function") {
          setUser((prev) => ({
            ...prev,
            subscription_plan:
              updatedSubscription.plan_tier ||
              updatedSubscription.plan_name ||
              updatedSubscription.subscription_plan ||
              prev?.subscription_plan,
            plan_tier: updatedSubscription.plan_tier || prev?.plan_tier,
            plan_name: updatedSubscription.plan_name || prev?.plan_name,
            subscription_status: updatedSubscription.status || prev?.subscription_status,
          }));
        }
      } else {
        // Fallback: якщо бекенд не повернув підписку — просто перезавантажуємо
        await loadSubscription();
      }

      // Оновлюємо дані користувача (план, фічі) якщо доступно
      if (typeof refreshAuth === "function") {
        try {
          await refreshAuth();
        } catch (err) {
          console.error("Failed to refresh auth after cancellation:", err);
        }
      }

      setCancelModalOpen(false);
      setCancelReason("");
    } catch (error) {
      console.error("Cancel subscription failed:", error);
      // Відображаємо текст помилки від бекенду (включно з:
      // "User does not have an active subscription to cancel."
      // "Stripe subscription cancellation error: <message>")
      showNotification(
        error?.message ||
          "Failed to cancel subscription. Please try again or contact support.",
        "error"
      );
    } finally {
      setCancelLoading(false);
    }
  }, [cancelImmediate, cancelReason, loadSubscription, refreshAuth, showNotification]);

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div style={{ color: 'var(--muted)' }}>Loading subscription data...</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display:'grid', gap:12, maxWidth: 920 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>{active.name}</div>
          {active.status === "cancelled" && (
            <div style={{ color:'var(--muted)', fontSize:12 }}>
              Your subscription has been cancelled. You are now on the Free plan.
            </div>
          )}
          {active.willCancelAt && active.status !== "cancelled" && (
            <div style={{ color:'var(--muted)', fontSize:12 }}>
              Subscription will be cancelled on {active.willCancelAt}
            </div>
          )}
          {!active.willCancelAt && active.renewal && active.status !== "cancelled" && (
            <div style={{ color:'var(--muted)', fontSize:12 }}>Renews on {active.renewal}</div>
          )}
        </div>
        <Badge>{active.tier}</Badge>
      </div>

      <div className="card" style={{ 
        background: document.documentElement.classList.contains('light-theme') 
          ? 'rgba(249, 250, 251, 0.6)' 
          : 'rgba(0,0,0,.25)' 
      }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Included features</div>
        <ul style={{ margin:0, paddingLeft:18 }}>
          {active.features.map((f, i) => (<li key={i}>✅ {f}</li>))}
        </ul>
      </div>

      <div className="card">
        <div style={{ fontWeight:600, marginBottom:8 }}>Active limits</div>
        <div style={{ display:'grid', gap:8 }}>
          {/* Відображаємо всі limits з enabled === true, навіть якщо значення 0 */}
          {active.usageMetadata?.ai_messages?.enabled && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>
                {active.usageMetadata.ai_messages.feature_name || 'AI Messages'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.usageMetadata.ai_messages.max_value === 0 || active.usageMetadata.ai_messages.max_value === Infinity
                    ? '∞'
                    : `${active.usageMetadata.ai_messages.current_value}/${active.usageMetadata.ai_messages.max_value} used`}
                </div>
                {active.usageMetadata.ai_messages.enabled && active.usageMetadata.ai_messages.max_value > 0 && active.usageMetadata.ai_messages.max_value !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${Math.min((active.usageMetadata.ai_messages.current_value/active.usageMetadata.ai_messages.max_value)*100, 100)}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {active.usageMetadata?.pdf_reports?.enabled && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>
                {active.usageMetadata.pdf_reports.feature_name || 'Reports (PDF Export)'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.usageMetadata.pdf_reports.max_value === 0 || active.usageMetadata.pdf_reports.max_value === Infinity
                    ? '∞'
                    : `${active.usageMetadata.pdf_reports.current_value}/${active.usageMetadata.pdf_reports.max_value} used`}
                </div>
                {active.usageMetadata.pdf_reports.enabled && active.usageMetadata.pdf_reports.max_value > 0 && active.usageMetadata.pdf_reports.max_value !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${Math.min((active.usageMetadata.pdf_reports.current_value/active.usageMetadata.pdf_reports.max_value)*100, 100)}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {active.usageMetadata?.csv_export?.enabled && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>
                {active.usageMetadata.csv_export.feature_name || 'CSV Data Export'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.usageMetadata.csv_export.max_value === 0 || active.usageMetadata.csv_export.max_value === Infinity
                    ? '∞'
                    : `${active.usageMetadata.csv_export.current_value}/${active.usageMetadata.csv_export.max_value} used`}
                </div>
                {active.usageMetadata.csv_export.enabled && active.usageMetadata.csv_export.max_value > 0 && active.usageMetadata.csv_export.max_value !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${Math.min((active.usageMetadata.csv_export.current_value/active.usageMetadata.csv_export.max_value)*100, 100)}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Fallback для інших limits, якщо вони не в usage але є в limits */}
          {!active.usageMetadata?.ai_messages?.enabled && active.limits.aiMessagesLimit > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>AI Messages</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.limits.aiMessagesUsed}/{active.limits.aiMessagesLimit === Infinity ? '∞' : active.limits.aiMessagesLimit} used
                </div>
                {active.limits.aiMessagesLimit !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${Math.min((active.limits.aiMessagesUsed/active.limits.aiMessagesLimit)*100, 100)}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {!active.usageMetadata?.pdf_reports?.enabled && active.limits.uploadsMax > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Document & Lab Uploads</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.limits.uploadsUsed}/{active.limits.uploadsMax === Infinity ? '∞' : active.limits.uploadsMax} used
                </div>
                {active.limits.uploadsMax !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${Math.min((active.limits.uploadsUsed/active.limits.uploadsMax)*100, 100)}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {active.limits.goalsMax > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Custom Goals</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.limits.goalsUsed}/{active.limits.goalsMax === Infinity ? '∞' : active.limits.goalsMax} used
                </div>
                {active.limits.goalsMax !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${Math.min((active.limits.goalsUsed/active.limits.goalsMax)*100, 100)}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {active.limits.notesMax > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Notes</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>
                  {active.limits.notesUsed}/{active.limits.notesMax === Infinity ? '∞' : active.limits.notesMax} used
                </div>
                {active.limits.notesMax !== Infinity && (
                  <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                    <div style={{ width:`${Math.min((active.limits.notesUsed/active.limits.notesMax)*100, 100)}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                  </div>
                )}
              </div>
            </div>
          )}
          {active.limits.familyMax > 0 && (
            <div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Family profiles</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="btn outline small" style={{ pointerEvents:'none' }}>{active.limits.familyUsed}/{active.limits.familyMax}</div>
                <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:999 }}>
                  <div style={{ width:`${Math.min((active.limits.familyUsed/active.limits.familyMax)*100, 100)}%`, height:6, background:'var(--primary)', borderRadius:999 }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', alignItems:'center', flexWrap:'wrap' }}>
        {isFamilyPlan && (() => {
          let shouldHide = false;
          
          // Перевірка 1: дані з API /family/members (пріоритет)
          if (familyMembersData && 
              familyMembersData.max_members != null && 
              familyMembersData.itemsTotal != null) {
            const maxMembers = Number(familyMembersData.max_members);
            const itemsTotal = Number(familyMembersData.itemsTotal);
            
            // Приховуємо тільки якщо itemsTotal >= max_members (досягнуто максимум)
            if (!isNaN(maxMembers) && !isNaN(itemsTotal) && itemsTotal >= maxMembers) {
              console.log('Hiding button: itemsTotal >= max_members', {
                itemsTotal,
                max_members: maxMembers,
                familyMembersData
              });
              shouldHide = true;
            } else {
              console.log('Showing button: itemsTotal < max_members', {
                itemsTotal,
                max_members: maxMembers,
                familyMembersData
              });
            }
          } else {
            console.log('Family members data not loaded or incomplete:', familyMembersData);
          }
          
          // Перевірка 2: дані з subscription (fallback, якщо API дані не завантажені)
          if (!shouldHide && active.limits.familyMax > 0) {
            const familyMax = Number(active.limits.familyMax);
            const familyUsed = Number(active.limits.familyUsed);
            
            if (!isNaN(familyMax) && !isNaN(familyUsed) && familyUsed >= familyMax) {
              console.log('Hiding button: familyUsed >= familyMax', {
                familyUsed,
                familyMax
              });
              shouldHide = true;
            }
          }
          
          // Якщо не потрібно приховувати, показуємо кнопку
          if (shouldHide) {
            return null;
          }
          
          return (
            <button
              className="btn secondary"
              onClick={() => setFamilyModalOpen(true)}
              style={{ fontSize: 12, padding: '6px 12px', marginRight: 'auto', whiteSpace:'nowrap' }}
            >
              Add family profile
            </button>
          );
        })()}
        {canCancelSubscription && (
          <button
            className="btn outline"
            onClick={() => setCancelModalOpen(true)}
            style={{ fontSize: 12, padding: '6px 12px', marginRight: isFamilyPlan ? 0 : 'auto' }}
          >
            Cancel subscription
          </button>
        )}
        <button 
          className="btn ghost" 
          onClick={loadSubscription}
          disabled={loading}
          title="Refresh subscription data"
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
        
        <button className="btn primary" onClick={() => {
          const tabs = document.querySelector('[role="tablist"]');
          if (tabs) {
            const upgradeTab = Array.from(tabs.querySelectorAll('button')).find(btn => btn.textContent === 'Upgrade Options');
            if (upgradeTab) upgradeTab.click();
          }
        }}>Upgrade</button>
      </div>

      {/* Add family member modal (Family plan only) */}
      <Modal
        open={familyModalOpen}
        title="Add Family Member Profile"
        onClose={() => {
          if (!familySaving) {
            setFamilyModalOpen(false);
          }
        }}
      >
        <form onSubmit={handleCreateFamilyMember} style={{ display: "grid", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
            Create a second profile under your Family plan. You can update details later from their profile.
          </p>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Nickname / display name</label>
            <input
              type="text"
              value={familyForm.family_member_name}
              onChange={(e) => handleFamilyInputChange("family_member_name", e.target.value)}
              placeholder="e.g. Emma, Dad, Child"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>First name</label>
              <input
                type="text"
                value={familyForm.first_name}
                onChange={(e) => handleFamilyInputChange("first_name", e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Last name</label>
              <input
                type="text"
                value={familyForm.last_name}
                onChange={(e) => handleFamilyInputChange("last_name", e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Date of birth</label>
              <DatePicker
                value={familyForm.dob || ""}
                onChange={(val) => handleFamilyInputChange("dob", val)}
                placeholder="MM/DD/YYYY"
              />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Sex at birth</label>
              <select
                value={familyForm.sex_of_birth}
                onChange={(e) => handleFamilyInputChange("sex_of_birth", e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Height</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={familyForm.height_cm || ""}
                  onChange={(e) => handleFamilyInputChange("height_cm", e.target.value)}
                  placeholder={familyHeightUnit === 'cm' ? 'e.g. 175' : 'e.g. 69'}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  border: '1px solid var(--border)', 
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      const newUnit = 'cm';
                      const h = parseFloat(familyForm.height_cm);
                      if (!isNaN(h) && h > 0) {
                        let newValue = h;
                        if (familyHeightUnit === 'in' && newUnit === 'cm') {
                          newValue = parseFloat((h * 2.54).toFixed(1));
                        }
                        handleFamilyInputChange("height_cm", newValue.toString());
                      }
                      setFamilyHeightUnit(newUnit);
                    }}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: familyHeightUnit === 'cm' ? 'var(--primary)' : 'transparent',
                      color: familyHeightUnit === 'cm' ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      borderRight: '1px solid var(--border)',
                      minWidth: '44px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (familyHeightUnit !== 'cm') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (familyHeightUnit !== 'cm') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newUnit = 'in';
                      const h = parseFloat(familyForm.height_cm);
                      if (!isNaN(h) && h > 0) {
                        let newValue = h;
                        if (familyHeightUnit === 'cm' && newUnit === 'in') {
                          newValue = parseFloat((h / 2.54).toFixed(1));
                        }
                        handleFamilyInputChange("height_cm", newValue.toString());
                      }
                      setFamilyHeightUnit(newUnit);
                    }}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: familyHeightUnit === 'in' ? 'var(--primary)' : 'transparent',
                      color: familyHeightUnit === 'in' ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      minWidth: '44px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (familyHeightUnit !== 'in') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (familyHeightUnit !== 'in') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    in
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Weight</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={familyForm.weight_kg || ""}
                  onChange={(e) => handleFamilyInputChange("weight_kg", e.target.value)}
                  placeholder={familyWeightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  border: '1px solid var(--border)', 
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--background-secondary, rgba(0, 0, 0, 0.02))'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      const newUnit = 'kg';
                      const w = parseFloat(familyForm.weight_kg);
                      if (!isNaN(w) && w > 0) {
                        let newValue = w;
                        if (familyWeightUnit === 'lb' && newUnit === 'kg') {
                          newValue = parseFloat((w / 2.20462).toFixed(1));
                        }
                        handleFamilyInputChange("weight_kg", newValue.toString());
                      }
                      setFamilyWeightUnit(newUnit);
                    }}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: familyWeightUnit === 'kg' ? 'var(--primary)' : 'transparent',
                      color: familyWeightUnit === 'kg' ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      borderRight: '1px solid var(--border)',
                      minWidth: '44px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (familyWeightUnit !== 'kg') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (familyWeightUnit !== 'kg') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newUnit = 'lb';
                      const w = parseFloat(familyForm.weight_kg);
                      if (!isNaN(w) && w > 0) {
                        let newValue = w;
                        if (familyWeightUnit === 'kg' && newUnit === 'lb') {
                          newValue = parseFloat((w * 2.20462).toFixed(1));
                        }
                        handleFamilyInputChange("weight_kg", newValue.toString());
                      }
                      setFamilyWeightUnit(newUnit);
                    }}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: familyWeightUnit === 'lb' ? 'var(--primary)' : 'transparent',
                      color: familyWeightUnit === 'lb' ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      minWidth: '44px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (familyWeightUnit !== 'lb') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (familyWeightUnit !== 'lb') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    lb
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                if (!familySaving) setFamilyModalOpen(false);
              }}
              disabled={familySaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={familySaving}>
              {familySaving ? "Saving..." : "Create profile"}
            </button>
          </div>
        </form>
      </Modal>
      
      {/* Cancel subscription modal */}
      <Modal
        open={cancelModalOpen}
        title="Cancel Subscription"
        onClose={() => {
          if (!cancelLoading) {
            setCancelModalOpen(false);
          }
        }}
      >
        <div style={{ display:'grid', gap:16 }}>
          <p style={{ fontSize:13, color:'var(--muted)', marginBottom:0 }}>
            Choose when to cancel your subscription. You can also tell us why you are cancelling (optional).
          </p>

          <div style={{ display:'grid', gap:8 }}>
            <label
              style={{
                display:'flex',
                alignItems:'flex-start',
                gap:8,
                cursor:'pointer',
                padding:8,
                borderRadius:8,
                border: !cancelImmediate ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: !cancelImmediate ? 'rgba(0, 186, 206, 0.06)' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="cancel-timing"
                checked={!cancelImmediate}
                onChange={() => setCancelImmediate(false)}
                style={{ 
                  marginTop: 4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  aspectRatio: '1 / 1',
                  cursor: 'pointer',
                }}
              />
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>Cancel at end of current period</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  You keep premium access until the end of your current billing period. After that, your plan will be cancelled.
                </div>
              </div>
            </label>

            <label
              style={{
                display:'flex',
                alignItems:'flex-start',
                gap:8,
                cursor:'pointer',
                padding:8,
                borderRadius:8,
                border: cancelImmediate ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: cancelImmediate ? 'rgba(0, 186, 206, 0.06)' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="cancel-timing"
                checked={cancelImmediate}
                onChange={() => setCancelImmediate(true)}
                style={{ 
                  marginTop: 4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  aspectRatio: '1 / 1',
                  cursor: 'pointer',
                }}
              />
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>Cancel immediately</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  Access to premium features will stop right away and your account will switch to the Free plan.
                </div>
              </div>
            </label>
          </div>

          <div style={{ display:'grid', gap:6 }}>
            <label style={{ fontSize:13, fontWeight:600 }}>
              Cancellation reason <span style={{ fontWeight:400, color:'var(--muted)' }}>(optional)</span>
            </label>
            <textarea
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why are you cancelling? This helps us improve."
              style={{
                width:'100%',
                resize:'vertical',
                padding:8,
                borderRadius:8,
                border:'1px solid var(--border)',
                background:'transparent',
                color:'var(--text)',
                fontSize:13,
                fontFamily:'inherit',
              }}
            />
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
            <button
              className="btn secondary"
              onClick={() => {
                if (!cancelLoading) {
                  setCancelModalOpen(false);
                }
              }}
              disabled={cancelLoading}
            >
              Keep subscription
            </button>
            <button
              className="btn primary"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
            >
              {cancelLoading ? 'Cancelling...' : 'Confirm cancellation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Feature Gating Examples */}
      <div className="card" style={{ maxWidth: 920, marginTop: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Feature Access Examples</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          When you try to access features not included in your current plan, you'll see upgrade prompts like these:
        </p>
        
        <div style={{ display: 'grid', gap: 12 }}>
          {/* AI Risk Forecasts Example */}
          <div 
            className="card" 
            style={{ 
              padding: 16, 
              background: 'rgba(0, 186, 206, 0.05)', 
              border: '1px solid rgba(0, 186, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.05)'}
            onClick={() => {
              setUpgradeFeature('aiRiskForecasts');
              setUpgradePromptOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🧠</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>AI Risk Forecasts</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              🚫 AI Risk Forecasts are not available on the Free plan.
              <br />
              Upgrade to <strong>Core</strong> to unlock intelligent health forecasting based on your data.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn outline small" style={{ fontSize: 12 }}>
                🔓 Upgrade Now
              </button>
            </div>
          </div>
          
          {/* Early Alerts Example */}
          <div 
            className="card" 
            style={{ 
              padding: 16, 
              background: 'rgba(0, 186, 206, 0.05)', 
              border: '1px solid rgba(0, 186, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.05)'}
            onClick={() => {
              setUpgradeFeature('earlyAlerts');
              setUpgradePromptOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>📈</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Early Alerts</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              🚫 Early Alerts are available only on the Complete and Family plans.
              <br />
              Upgrade to <strong>Complete</strong> to receive proactive health warnings based on trend analysis.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn outline small" style={{ fontSize: 12 }}>
                🔓 Upgrade Now
              </button>
            </div>
          </div>
          
          {/* Reports Example */}
          <div 
            className="card" 
            style={{ 
              padding: 16, 
              background: 'rgba(0, 186, 206, 0.05)', 
              border: '1px solid rgba(0, 186, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.05)'}
            onClick={() => {
              setUpgradeFeature('reportsPdf');
              setUpgradePromptOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🧾</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Reports (PDF Export)</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              🚫 PDF Reports are not included in your current plan.
              <br />
              Upgrade to <strong>Core</strong> or higher to generate exportable reports of your health insights.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn outline small" style={{ fontSize: 12 }}>
                🔓 Upgrade Now
              </button>
            </div>
          </div>
          
          {/* Family Sharing Example */}
          <div 
            className="card" 
            style={{ 
              padding: 16, 
              background: 'rgba(0, 186, 206, 0.05)', 
              border: '1px solid rgba(0, 186, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 186, 206, 0.05)'}
            onClick={() => {
              setUpgradeFeature('familySharing');
              setUpgradePromptOpen(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>👨‍👧</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Family Sharing</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              🚫 Family Sharing is only available on the Family Plan.
              <br />
              Upgrade to <strong>Family</strong> to manage up to 2 users under one shared health dashboard.
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="btn outline small" style={{ fontSize: 12 }}>
                🔓 Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <UpgradePrompt 
        open={upgradePromptOpen} 
        onClose={() => setUpgradePromptOpen(false)} 
        feature={upgradeFeature}
        user={user}
      />
    </div>
  );
}

function UpgradeOptions({ onUpgradeSuccess, onSubscriptionUpdate }) {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [period, setPeriod] = React.useState("monthly");
  const [hoveredRow, setHoveredRow] = React.useState(null); // Track hovered row index
  const [allPlans, setAllPlans] = React.useState([]); // Store all loaded plans
  const [currentSubscription, setCurrentSubscription] = React.useState(null); // Current user subscription
  const [loading, setLoading] = React.useState(true);
  const [upgrading, setUpgrading] = React.useState(null);
  const [confirmUpgrade, setConfirmUpgrade] = React.useState({ open: false, plan: null });
  const monthly = period === "monthly";
  
  // Detect theme
  const [isLightTheme, setIsLightTheme] = React.useState(() => {
    return document.documentElement.classList.contains('light-theme');
  });
  
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightTheme(document.documentElement.classList.contains('light-theme'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Load current subscription to identify active plan
  const loadCurrentSubscription = React.useCallback(async () => {
    try {
      const data = await SubscriptionApi.getMySubscription();

      // Нова структура API: { result: { subscription: {...}, usage: {...}, plan_features: {...} } }
      // Стара структура: { result: { subscription: {...} } } або { subscription: {...} }
      const subscriptionData = data?.result?.subscription ||
                               data?.result ||
                               data?.subscription ||
                               data;
      
      // Зберігаємо також usage та plan_features з result
      const usageData = data?.result?.usage || null;
      const planFeaturesData = data?.result?.plan_features || null;
      
      // Додаємо usage та plan_features до subscription об'єкта для зручності
      if (subscriptionData) {
        subscriptionData.usage = usageData || subscriptionData.usage;
        subscriptionData.plan_features = planFeaturesData || subscriptionData.plan_features;
      }

      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error("Failed to load current subscription:", error);
      // Не показуємо помилку, бо це не критично для відображення планів
      setCurrentSubscription(null);
    }
  }, []);

  // Load plans and current subscription on mount
  React.useEffect(() => {
    loadPlans();
    loadCurrentSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Оновлюємо поточну підписку при поверненні на вкладку (після upgrade)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCurrentSubscription();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadCurrentSubscription]);

  // Determine current plan identifier
  // Використовуємо subscription_plan_id з API /my_subscription, який збігається з id плану
  const currentPlanId = React.useMemo(() => {
    if (!currentSubscription) {
      return null;
    }
    
    // Перевіряємо subscription_plan_id (основне поле для порівняння)
    // API повертає subscription_plan_id безпосередньо в subscription об'єкті
    const subscriptionPlanId = currentSubscription.subscription_plan_id ||
                                currentSubscription.subscription_details?.subscription_plan_id ||
                                currentSubscription.plan_id ||
                                currentSubscription.subscription_details?.plan_id ||
                                currentSubscription.current_plan_id ||
                                currentSubscription.plan?.id ||
                                null;
    
    return subscriptionPlanId;
  }, [currentSubscription]);

  // Determine current plan name/key for matching (fallback, якщо ID не знайдено)
  const currentPlanKey = React.useMemo(() => {
    if (!currentSubscription || currentPlanId) return null; // Якщо є ID, не використовуємо name
    
    // Отримуємо назву/ключ плану для порівняння (тільки якщо немає ID)
    const planName = currentSubscription.subscription_details?.plan_name?.toLowerCase() ||
                     currentSubscription.plan_name?.toLowerCase() ||
                     currentSubscription.current_plan?.toLowerCase() ||
                     currentSubscription.plan?.name?.toLowerCase() ||
                     null;
    
    return planName;
  }, [currentSubscription, currentPlanId]);

  // Sort plans based on current period and determine recommended plan
  const plans = React.useMemo(() => {
    if (allPlans.length === 0) return [];
    
    // Створюємо копію планів
    const plansCopy = [...allPlans].map(p => ({ ...p }));
    
    // Скидаємо всі recommended
    plansCopy.forEach(plan => {
      plan.recommended = false;
    });
    
    // Визначаємо поточний план
    let currentPlan = null;
    if (currentPlanId) {
      currentPlan = plansCopy.find(p => p.id && String(p.id) === String(currentPlanId));
    }
    if (!currentPlan && currentPlanKey) {
      currentPlan = plansCopy.find(p => p.key && p.key.toLowerCase() === currentPlanKey.toLowerCase());
    }
    
    // Якщо не знайдено поточний план, вважаємо що це Starter
    if (!currentPlan) {
      currentPlan = plansCopy.find(p => p.key === 'starter') || plansCopy[0];
    }
    
    // Знаходимо найближчий план, який дорожчий за поточний
    // Використовуємо monthly ціну для порівняння
    const currentPrice = currentPlan.priceMonthly || 0;
    const availablePlans = plansCopy.filter(p => 
      p.key !== currentPlan.key && 
      (p.priceMonthly || 0) > currentPrice
    );
    
    if (availablePlans.length > 0) {
      // Сортуємо за ціною (від найдешевшого до найдорожчого)
      availablePlans.sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0));
      const recommendedPlan = availablePlans[0]; // Найближчий дорожчий план
      
      // Встановлюємо recommended для цього плану
      const planToUpdate = plansCopy.find(p => p.key === recommendedPlan.key);
      if (planToUpdate) {
        planToUpdate.recommended = true;
        // Оновлюємо subtitle та ribbon для рекомендованого плану
        if (planToUpdate.key === 'core') {
          planToUpdate.subtitle = 'Most Popular';
          planToUpdate.ribbon = 'Most popular';
        } else if (planToUpdate.key === 'complete') {
          planToUpdate.subtitle = 'Best Value';
          planToUpdate.ribbon = 'Best value';
        } else if (planToUpdate.key === 'family') {
          planToUpdate.subtitle = 'For Families';
          planToUpdate.ribbon = null;
        }
      }
    }
    
    // Сортуємо за ціною (ascending) - use monthly or yearly price based on selected period
    return plansCopy.sort((a, b) => {
      const priceA = monthly ? a.priceMonthly : a.priceYearly;
      const priceB = monthly ? b.priceMonthly : b.priceYearly;
      return priceA - priceB;
    });
  }, [allPlans, monthly, currentPlanId, currentPlanKey]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await SubscriptionApi.getPlans();
      // API returns data in result array
      const plansData = response?.result || response || [];
      
      // Map API plans to UI format
      const mappedPlans = plansData
        .filter(plan => plan.is_active !== false) // Only show active plans
        .map(plan => {
          const planTier = plan.plan_tier?.toLowerCase() || plan.name?.toLowerCase() || 'starter';
          const features = plan.features || [];
          
          // Build features list from features array
          const featureList = features.map(feature => {
            const featureName = feature.feature_name || feature.feature;
            const limitValue = feature.limit_value;
            const isLimited = feature.is_limited;
            
            // If not limited or limit is 0, just return feature name
            if (!isLimited || limitValue === 0) {
              return featureName;
            }
            
            // If unlimited (-1)
            if (limitValue === -1) {
              // Format based on feature type
              if (feature.feature_key === 'ai_messages') {
                return 'Unlimited AI Messages/month';
              } else if (feature.feature_key === 'document_uploads') {
                return 'Unlimited Document Uploads';
              } else if (feature.feature_key === 'notes') {
                return 'Unlimited Notes';
              } else if (feature.feature_key === 'custom_goals') {
                return 'Unlimited Custom Goals';
              } else if (feature.feature_key === 'goal_history') {
                return 'Unlimited Goal History';
              } else if (feature.feature_key === 'chat_history') {
                return 'Full Chat History';
              }
              return featureName;
            }
            
            // If limited with specific value
            if (limitValue > 0) {
              if (feature.feature_key === 'ai_messages') {
                return `${limitValue} AI Messages/month`;
              } else if (feature.feature_key === 'document_uploads') {
                return `${limitValue} Document Uploads/month`;
              } else if (feature.feature_key === 'notes') {
                return `Up to ${limitValue} Notes`;
              } else if (feature.feature_key === 'custom_goals') {
                return `Up to ${limitValue} Custom Goals`;
              } else if (feature.feature_key === 'goal_history') {
                return `${limitValue}-day Goal History`;
              } else if (feature.feature_key === 'chat_history') {
                return `${limitValue}-day Chat History`;
              } else if (feature.feature_key === 'family_sharing') {
                return `Family Sharing (${limitValue} linked user${limitValue > 1 ? 's' : ''})`;
              }
            }
            
            return featureName;
          });

          // Determine subtitle and ribbon
          let subtitle = '';
          let ribbon = null;
          let recommended = false;
          
          if (planTier === 'starter') {
            subtitle = 'Free';
            ribbon = 'Free Tier';
          } else if (planTier === 'core' || planTier === 'сore') {
            subtitle = 'Most Popular';
            ribbon = 'Most popular';
            recommended = true;
          } else if (planTier === 'complete') {
            subtitle = 'Best Value';
            ribbon = 'Best value';
          } else if (planTier === 'family') {
            subtitle = 'For Families';
          }

          // Normalize key - handle both latin and cyrillic 'c'
          const normalizedKey = planTier === 'сore' ? 'core' : planTier;
          
          // Format name with first letter capitalized (preserve rest of the string)
          const formatName = (name) => {
            if (!name) return '';
            // Only capitalize first letter, keep the rest as is
            return name.charAt(0).toUpperCase() + name.slice(1);
          };
          
          const planName = plan.display_name || plan.name || '';
          const formattedName = planName ? formatName(planName) : '';
          
          const priceMonthly = plan.price_monthly || plan.price || 0;
          const priceYearly = plan.price_annual || (plan.price_monthly ? plan.price_monthly * 12 : plan.price || 0);
          
          return {
            key: normalizedKey,
            id: plan.id,
            name: formattedName,
            subtitle,
            priceMonthly,
            priceYearly,
            features: featureList.length > 0 ? featureList : ['Manual Health Data Entry', 'Secure Data Backup'],
            gated: [], // Will be calculated based on what's not in features
            ribbon,
            recommended,
            maxMembers: plan.max_members || 1,
            isFeatured: plan.is_featured || false,
          };
        });
      
      // Fallback to default plans if API returns empty
      const defaultPlans = [
        { 
          key:'starter', 
          name:'Starter', 
          subtitle:'Free', 
          priceMonthly:0, 
          priceYearly:0, 
          features:['Manual Health Data Entry','10 AI Messages/month','Secure Data Backup'], 
          gated:['AI Risk Forecasts','Early Alerts','Reports','CSV Export','Document Uploads','Custom Goals','Goal History','Notes (3+)','Chat History','Share with Providers','Family Sharing'], 
          ribbon:'Free Tier',
          recommended:false,
        },
        { 
          key:'core', 
          name:'Core', 
          subtitle:'Most Popular', 
          priceMonthly:9, 
          priceYearly:90, 
          features:['Everything in Starter','50 AI Messages/month','AI Risk Forecasts','Reports (PDF)','3 Document Uploads/month','Up to 10 Custom Goals','90-day Goal History','Up to 30 Notes','30-day Chat History'], 
          gated:['Early Alerts','CSV Export','Unlimited Uploads','Unlimited Goals','Unlimited Notes','Full Chat History','Share with Providers','Family Sharing'], 
          ribbon:'Most popular',
          recommended:true
        },
        { 
          key:'complete', 
          name:'Complete', 
          subtitle:'Best Value', 
          priceMonthly:19, 
          priceYearly:190, 
          features:['Everything in Core','Unlimited AI Messages','Early Alerts','CSV Data Export','Unlimited Document Uploads','Unlimited Custom Goals','Unlimited Goal History','Unlimited Notes','Full Chat History','Share with Providers'], 
          gated:['Family Sharing'], 
          ribbon:'Best value',
          recommended:false
        },
        { 
          key:'family', 
          name:'Family', 
          subtitle:'For Families', 
          priceMonthly:29, 
          priceYearly:290, 
          features:['Everything in Complete','Family Sharing (1 linked user)'], 
          gated:[], 
          ribbon:null,
          recommended:false
        },
      ];
      
      const finalPlans = mappedPlans.length > 0 ? mappedPlans : defaultPlans;
      
      // Рекомендований план буде визначено в useMemo для plans на основі поточного плану користувача
      setAllPlans(finalPlans);
    } catch (error) {
      console.error("Failed to load plans:", error);
      showNotification(error.message || "Failed to load subscription plans", "error");
      // Use default plans on error
      setAllPlans([
        { 
          key:'starter', 
          name:'Starter', 
          subtitle:'Free', 
          priceMonthly:0, 
          priceYearly:0, 
          features:['Manual Health Data Entry','10 AI Messages/month','Secure Data Backup'], 
          gated:['AI Risk Forecasts','Early Alerts','Reports','CSV Export','Document Uploads','Custom Goals','Goal History','Notes (3+)','Chat History','Share with Providers','Family Sharing'], 
          ribbon:'Free Tier',
          recommended:false,
        },
        { 
          key:'core', 
          name:'Core', 
          subtitle:'Most Popular', 
          priceMonthly:9, 
          priceYearly:90, 
          features:['Everything in Starter','50 AI Messages/month','AI Risk Forecasts','Reports (PDF)','3 Document Uploads/month','Up to 10 Custom Goals','90-day Goal History','Up to 30 Notes','30-day Chat History'], 
          gated:['Early Alerts','CSV Export','Unlimited Uploads','Unlimited Goals','Unlimited Notes','Full Chat History','Share with Providers','Family Sharing'], 
          ribbon:'Most popular',
          recommended:true
        },
        { 
          key:'complete', 
          name:'Complete', 
          subtitle:'Best Value', 
          priceMonthly:19, 
          priceYearly:190, 
          features:['Everything in Core','Unlimited AI Messages','Early Alerts','CSV Data Export','Unlimited Document Uploads','Unlimited Custom Goals','Unlimited Goal History','Unlimited Notes','Full Chat History','Share with Providers'], 
          gated:['Family Sharing'], 
          ribbon:'Best value',
          recommended:false
        },
        { 
          key:'family', 
          name:'Family', 
          subtitle:'For Families', 
          priceMonthly:29, 
          priceYearly:290, 
          features:['Everything in Complete','Family Sharing (1 linked user)'], 
          gated:[], 
          ribbon:null,
          recommended:false
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = (plan) => {
    if (!plan || !plan.id) {
      showNotification("Plan ID is required", "error");
      return;
    }
    setConfirmUpgrade({ open: true, plan });
  };

  const handleUpgrade = async (planId) => {
    if (!planId) {
      showNotification("Plan ID is required", "error");
      return;
    }

    try {
      setUpgrading(planId);
      setConfirmUpgrade({ open: false, plan: null });

      // Build success and cancel URLs (for HashRouter)
      // In production we are hosted under /Anatomous on GitHub Pages
      const baseOrigin = window.location.origin;
      const baseUrl = `${baseOrigin}/Anatomous`;
      const successUrl = `${baseUrl}/#/dashboard/subscriptions/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/#/dashboard/subscriptions/checkout/cancel`;

      // Prepare request body for upgrade / checkout session
      const checkoutPayload = {
        plan_id: planId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_type: 'subscription',
        billing_period: period, // "monthly" or "annual"
      };


      // Create Stripe Checkout Session
      // According to API spec: required fields are plan_id, success_url, cancel_url
      // payment_type is optional with default "subscription"
      const sessionResult = await PaymentApi.createCheckoutSession(checkoutPayload);

      if (!sessionResult) {
        throw new Error("Failed to create checkout session: empty response");
      }

      // Check for error in response
      // Якщо success: false або є error поле - це помилка
      // message може бути інформаційним повідомленням (наприклад, "MOCK: ...")
      if (sessionResult.success === false || sessionResult.error) {
        throw new Error(sessionResult.error || sessionResult.message || "Failed to create checkout session");
      }
      
      // Якщо success: true, message - це просто інформація, не помилка
      if (sessionResult.success === true && sessionResult.message) {
      }

      // Backend returns checkout URL directly (no need for Stripe.js on frontend)
      // According to API spec and actual response, we check multiple possible fields:
      // - checkout_session.url (actual response structure)
      // - checkout_url (direct URL to redirect)
      // - url (Stripe Checkout URL)
      // - session_url (alternative field name)
      // - result.checkout_url (if wrapped in result object)
      // - result.url (if wrapped in result object)
      const checkoutUrl = sessionResult.checkout_session?.url ||
                         sessionResult.checkout_url || 
                         sessionResult.url || 
                         sessionResult.session_url ||
                         sessionResult.result?.checkout_url ||
                         sessionResult.result?.url ||
                         sessionResult.result?.session_url;

      if (!checkoutUrl) {
        // Log full response for debugging
        console.error('❌ No checkout URL in response:', sessionResult);
        
        // Fallback: if backend only returns session_id, we can't construct URL manually
        // Backend must return full checkout URL
        if (sessionResult.session_id || sessionResult.result?.session_id) {
          const sessionId = sessionResult.session_id || sessionResult.result?.session_id;
          throw new Error(
            `Backend returned session_id (${sessionId}) but not checkout_url. ` +
            `Please update backend to return full checkout URL in 'checkout_url' or 'url' field.`
          );
        }
        throw new Error(
          "No checkout URL returned from backend. " +
          "Expected fields: checkout_url, url, or session_url. " +
          `Received: ${JSON.stringify(Object.keys(sessionResult))}`
        );
      }

      // Clean up URL: fix double ? and remove placeholder session_id={CHECKOUT_SESSION_ID}
      // Example: "http://localhost:5173/#/dashboard/...?session_id={CHECKOUT_SESSION_ID}?session_id=real_id&mock=true" 
      // Should be: "http://localhost:5173/#/dashboard/...?session_id=real_id&mock=true"
      let cleanUrl = checkoutUrl;
      
      // Функція для виправлення подвійних ? на &
      const fixDoubleQuestionMarks = (url) => {
        // Знаходимо всі входження ? після першого
        const parts = url.split('?');
        if (parts.length <= 2) return url; // Немає подвійних ?
        
        // Перший ? залишаємо, решту замінюємо на &
        const base = parts[0];
        const queryParts = parts.slice(1);
        const fixedQuery = queryParts.join('&');
        
        return `${base}?${fixedQuery}`;
      };
      
      // Функція для видалення placeholder session_id
      const removePlaceholderSessionId = (url) => {
        const hashIndex = url.indexOf('#');
        let beforeHash = '';
        let afterHash = '';
        
        if (hashIndex !== -1) {
          beforeHash = url.substring(0, hashIndex);
          afterHash = url.substring(hashIndex);
        } else {
          beforeHash = url;
        }
        
        // Обробляємо hash частину
        if (afterHash.includes('?')) {
          const hashParts = afterHash.split('?');
          const hashBase = hashParts[0];
          const queryString = hashParts.slice(1).join('&'); // Об'єднуємо всі query частини через &
          
          // Парсимо query параметри
          const params = new URLSearchParams(queryString);
          
          // Знаходимо всі session_id параметри
          const allSessionIds = Array.from(params.entries())
            .filter(([key]) => key === 'session_id')
            .map(([, value]) => decodeURIComponent(value));
          
          // Видаляємо всі session_id
          params.delete('session_id');
          
          // Додаємо тільки реальне значення (без {CHECKOUT_SESSION_ID})
          const realSessionId = allSessionIds.find(id => !id.includes('{CHECKOUT_SESSION_ID}'));
          if (realSessionId) {
            params.set('session_id', realSessionId);
          }
          
          const newQuery = params.toString();
          return beforeHash + hashBase + (newQuery ? '?' + newQuery : '');
        }
        
        // Обробляємо URL без hash
        if (beforeHash.includes('?')) {
          const urlParts = beforeHash.split('?');
          const baseUrl = urlParts[0];
          const queryString = urlParts.slice(1).join('&');
          const params = new URLSearchParams(queryString);
          
          const sessionIdValue = params.get('session_id');
          if (sessionIdValue && sessionIdValue.includes('{CHECKOUT_SESSION_ID}')) {
            params.delete('session_id');
          }
          
          const newQuery = params.toString();
          return newQuery ? `${baseUrl}?${newQuery}` : baseUrl;
        }
        
        return url;
      };
      
      // Спочатку виправляємо подвійні ?
      cleanUrl = fixDoubleQuestionMarks(checkoutUrl);
      
      // Потім видаляємо placeholder session_id
      if (cleanUrl !== checkoutUrl || cleanUrl.includes('{CHECKOUT_SESSION_ID}')) {
        cleanUrl = removePlaceholderSessionId(cleanUrl);
        console.warn('⚠️ Fixed URL:', checkoutUrl, '→', cleanUrl);
      }
      
      // Перевіряємо, чи URL валідний
      if (!cleanUrl || cleanUrl.trim() === '') {
        throw new Error('Invalid checkout URL: empty or undefined');
      }
      
      // Redirect to checkout URL
      // Для HashRouter URLs (#/dashboard/...) використовуємо window.location.href
      
      // Використовуємо href для HashRouter (має працювати для обох випадків)
      window.location.href = cleanUrl;
      
      // Додаткова перевірка через 300ms (якщо redirect не спрацював)
      setTimeout(() => {
        const currentUrl = window.location.href;
        const expectedHash = cleanUrl.split('#')[1]?.split('?')[0]; // hash path without query
        const currentHash = currentUrl.split('#')[1]?.split('?')[0];
        
        if (expectedHash && currentHash !== expectedHash) {
          console.warn('⚠️ Redirect might have failed!');
          console.warn('   Expected hash:', expectedHash);
          console.warn('   Current hash:', currentHash);
          console.warn('   Full expected URL:', cleanUrl);
          console.warn('   Full current URL:', currentUrl);
          console.warn('   Retrying redirect...');
          
          // Спробуємо ще раз
          window.location.href = cleanUrl;
      }
      }, 300);
    } catch (error) {
      console.error("Upgrade failed:", error);
      showNotification(error.message || "Failed to start checkout process", "error");
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div style={{ color: 'var(--muted)' }}>Loading plans...</div>
      </div>
    );
  }

  // Feature matrix (show everything in one place, as is common in pricing pages)
  const featureMatrix = [
    { label: 'Manual Health Data Entry', keys: { starter:true, core:true, complete:true, family:true } },
    { label: 'AI Messages per Month', keys: { starter:'10', core:'50', complete:'Unlimited', family:'Unlimited' } },
    { label: 'AI-Driven Risk Forecasts', keys: { starter:false, core:true, complete:true, family:true } },
    { label: 'Early Alerts', keys: { starter:false, core:false, complete:true, family:true } },
    { label: 'Reports (PDF Export)', keys: { starter:false, core:true, complete:true, family:true } },
    { label: 'CSV Data Export', keys: { starter:false, core:false, complete:true, family:true } },
    { label: 'Document & Lab Uploads', keys: { starter:false, core:'3/month', complete:'Unlimited', family:'Unlimited' } },
    { label: 'Custom Goals', keys: { starter:false, core:'Up to 10', complete:'Unlimited', family:'Unlimited' } },
    { label: 'Goal History', keys: { starter:false, core:'90-day history', complete:'Unlimited', family:'Unlimited' } },
    { label: 'Notes', keys: { starter:'Up to 3', core:'Up to 30', complete:'Unlimited', family:'Unlimited' } },
    { label: 'Chat History Access', keys: { starter:'None', core:'30-day history', complete:'Full history', family:'Full history' } },
    { label: 'Share with Providers', keys: { starter:false, core:false, complete:true, family:true } },
    { label: 'Family Sharing (Users)', keys: { starter:false, core:false, complete:false, family:'1 linked user' } },
    { label: 'Secure Data Backup', keys: { starter:true, core:true, complete:true, family:true } },
  ];

  return (
    <div className="card" style={{ display:'grid', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontWeight:600 }}>Choose your plan</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:'var(--muted)' }}>Billing:</span>
          <div className="btn-group" style={{ gap:0 }}>
            <button className={`btn small ${monthly ? 'primary' : 'outline'}`} onClick={()=>setPeriod('monthly')}>Monthly</button>
            <button className={`btn small ${!monthly ? 'primary' : 'outline'}`} onClick={()=>setPeriod('annual')}>Annual</button>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16 }}>
        {plans.map(p => {
          const isFree = p.key === 'starter';
          const price = monthly ? p.priceMonthly : p.priceYearly;
          const pricePerMonth = monthly ? price : Math.round(price / 12);
          const isLightTheme = document.documentElement.classList.contains('light-theme');
          
          // Перевіряємо, чи це поточний план користувача
          // Основне порівняння: subscription_plan_id з API === id плану
          // Starter (Free) НЕ може бути поточним планом, якщо є активна підписка
          const planIdMatch = currentPlanId && p.id && String(currentPlanId) === String(p.id);
          const planKeyMatch = !currentPlanId && currentPlanKey && p.key && currentPlanKey === p.key.toLowerCase() && p.key !== 'starter';
          const planNameMatch = !currentPlanId && currentPlanKey && p.name && currentPlanKey === p.name.toLowerCase() && p.key !== 'starter';
          
          // Starter не може бути поточним планом, якщо є currentPlanId (тобто є активна підписка)
          const isCurrentPlan = (planIdMatch || planKeyMatch || planNameMatch) && 
                                 !(p.key === 'starter' && currentPlanId); // Starter не є поточним, якщо є активна підписка
          
          return (
            <div 
              key={p.key} 
              className="card" 
              style={{ 
                display:'flex',
                flexDirection:'column',
                gap:12, 
                position:'relative',
                    border: isCurrentPlan
                      ? '2px solid var(--success)'
                      : p.recommended
                        ? '2px solid var(--primary)'
                        : '1px solid var(--border)',
                    background: isCurrentPlan
                      ? (isLightTheme ? 'rgba(0, 195, 122, 0.08)' : 'rgba(0, 195, 122, 0.05)')
                      : p.recommended
                  ? (isLightTheme ? 'rgba(0, 186, 206, 0.08)' : 'rgba(0, 186, 206, 0.05)')
                  : (isLightTheme ? 'rgba(249, 250, 251, 0.8)' : 'rgba(17,17,17,.85)'),
                transition: 'all 0.2s',
                cursor: 'pointer',
                height: '100%'
              }}
              onMouseEnter={(e) => {
                    // Поточний план завжди залишається зеленим
                    if (isCurrentPlan) {
                      e.currentTarget.style.border = '2px solid var(--success)';
                      e.currentTarget.style.background = isLightTheme
                        ? 'rgba(0, 195, 122, 0.12)'
                        : 'rgba(0, 195, 122, 0.08)';
                    } else if (!p.recommended) {
                  e.currentTarget.style.border = '1px solid var(--primary)';
                  e.currentTarget.style.background = isLightTheme 
                    ? 'rgba(0, 186, 206, 0.1)' 
                    : 'rgba(0, 186, 206, 0.03)';
                }
              }}
              onMouseLeave={(e) => {
                    // Поточний план завжди залишається зеленим
                    if (isCurrentPlan) {
                      e.currentTarget.style.border = '2px solid var(--success)';
                      e.currentTarget.style.background = isLightTheme
                        ? 'rgba(0, 195, 122, 0.08)'
                        : 'rgba(0, 195, 122, 0.05)';
                    } else if (!p.recommended) {
                  e.currentTarget.style.border = '1px solid var(--border)';
                  e.currentTarget.style.background = isLightTheme 
                    ? 'rgba(249, 250, 251, 0.8)' 
                    : 'rgba(17,17,17,.85)';
                }
              }}
            >
              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div style={{ position:'absolute', top:12, right:12, zIndex: 2 }}>
                  <Badge tone="success">
                    Current Plan
                  </Badge>
                </div>
              )}
              
              {/* Other badges (ribbon) - показуємо тільки якщо не поточний план */}
              {p.ribbon && !isCurrentPlan && (
                <div style={{ position:'absolute', top:12, right:12 }}>
                  <Badge tone={p.ribbon==='Free Tier' ? 'secondary' : p.ribbon==='Most popular' ? 'success' : 'primary'}>
                    {p.ribbon}
                  </Badge>
                </div>
              )}
              
              {p.recommended && (
                <div style={{
                  position:'absolute',
                  top:0,
                  left:0,
                  right:0,
                  height:4,
                  background: 'linear-gradient(90deg, var(--primary), rgba(0, 186, 206, 0.5))',
                  borderRadius: '8px 8px 0 0'
                }} />
              )}
              
              <div style={{ display:'flex', flexDirection:'column', gap:4, paddingTop: p.ribbon ? 8 : 0, flexShrink: 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontWeight:700, fontSize:20 }}>{p.name}</div>
                  {p.recommended && (
                    <span style={{ 
                      fontSize:10, 
                      fontWeight:600, 
                      padding: '2px 6px', 
                      background: 'var(--primary)', 
                      color: 'var(--bg)', 
                      borderRadius: 4 
                    }}>
                      RECOMMENDED
                    </span>
                  )}
                </div>
                {p.subtitle && (
                  <div style={{ fontSize:12, color: isLightTheme ? '#4b5563' : 'var(--muted)', fontWeight: 500 }}>{p.subtitle}</div>
                )}
              </div>
              
              <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink: 0, minHeight: 80 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span style={{ fontSize:32, fontWeight:800 }}>
                    {isFree ? '$0' : `$${price}`}
                  </span>
                  {!isFree && (
                    <span style={{ fontSize:14, color:'var(--muted)' }}>
                      {monthly ? '/mo' : '/yr'}
                    </span>
                  )}
                </div>
                {!isFree && !monthly && (
                  <div style={{ fontSize:12, color:'var(--muted)' }}>
                    ${pricePerMonth}/mo billed annually
                  </div>
                )}
                {(() => {
                  // Calculate savings dynamically based on current period
                  const savings = !monthly && p.key !== 'starter' && p.priceMonthly && p.priceYearly
                    ? `Save $${Math.round((p.priceMonthly * 12 - p.priceYearly))}/year`
                    : null;
                  
                  return savings && (
                    <div style={{ 
                      fontSize:11, 
                      fontWeight:600, 
                      color:'var(--success)', 
                      padding: '4px 8px', 
                      background: 'rgba(0, 195, 122, 0.1)', 
                      borderRadius: 4,
                      width: 'fit-content'
                    }}>
                      💰 {savings}
                    </div>
                  );
                })()}
              </div>
              
              <div style={{ display:'flex', flexDirection:'column', gap:8, flex: 1 }}>
                <div>
                  <div style={{ fontWeight:600, marginBottom:8, fontSize:13 }}>What's included</div>
                  <ul style={{ margin:0, paddingLeft:20, display:'grid', gap:6, fontSize:13, lineHeight:1.6 }}>
                    {p.features.map((f,i)=>(
                      <li key={i} style={{ color:'var(--text)', display:'flex', alignItems:'start', gap:6 }}>
                        <span style={{ color:'var(--success)', flexShrink:0, marginTop:2 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {p.gated?.length > 0 && (
                  <div style={{ opacity:0.7, paddingTop:8, borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontWeight:600, marginBottom:8, fontSize:13, color:'var(--muted)' }}>Not included</div>
                    <ul style={{ margin:0, paddingLeft:20, display:'grid', gap:6, fontSize:12, lineHeight:1.6 }}>
                      {p.gated.slice(0, 3).map((f,i)=>(
                        <li key={i} style={{ color:'var(--muted)', display:'flex', alignItems:'start', gap:6 }}>
                          <span style={{ color:'var(--muted)', flexShrink:0, marginTop:2 }}>✗</span>
                          <span>{f}</span>
                        </li>
                      ))}
                      {p.gated.length > 3 && (
                        <li style={{ color:'var(--muted)', fontSize:11 }}>
                          +{p.gated.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              
              <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8, flexShrink: 0, marginTop: 'auto' }}>
                <button 
                  className={`btn ${isCurrentPlan ? 'outline' : isFree ? 'outline' : p.recommended ? 'primary' : 'primary'}`}
                  style={{ 
                    width: '100%',
                    fontWeight: p.recommended ? 600 : 500,
                    opacity: isCurrentPlan ? 0.7 : 1
                  }}
                  onClick={() => {
                    if (isCurrentPlan) return; // Не робимо нічого для поточного плану
                    // Для Free плану та інших планів - однакова дія (виклик handleUpgradeClick)
                    if (p.id) {
                      handleUpgradeClick(p);
                    } else if (isFree) {
                      // Якщо Free план не має ID, показуємо повідомлення
                      showNotification("Please select a paid plan to upgrade", "info");
                    }
                  }}
                  disabled={isCurrentPlan || upgrading === p.id || (isFree && !p.id)}
                  title={isCurrentPlan ? 'This is your current plan' : isFree ? 'Free plan - click to see upgrade options' : undefined}
                >
                  {(() => {
                    if (upgrading === p.id) return 'Processing...';
                    if (isCurrentPlan) return 'Current Plan';
                    if (isFree) return 'Free Plan';
                    return monthly ? 'Upgrade Now' : 'Upgrade Annually';
                  })()}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      { !monthly && (
        <div className="card" style={{ 
          display:'flex', 
          alignItems:'center', 
          gap:12,
          padding: 16,
          background: 'rgba(0, 186, 206, 0.1)',
          border: '1px solid rgba(0, 186, 206, 0.2)'
        }}>
          <div style={{ 
            fontSize: 24,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary)',
            borderRadius: '50%',
            flexShrink: 0
          }}>
            💰
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight:600, marginBottom:4, fontSize:14 }}>Save up to 17% with Annual billing</div>
            <div style={{ color:'var(--muted)', fontSize:13, lineHeight:1.5 }}>
              Annual billing shows total yearly price; you typically save 2 months vs monthly billing.
            </div>
          </div>
        </div>
      )}

      {/* Full feature comparison */}
      <div className="card" style={{ 
        overflowX:'auto', 
        marginTop: 8,
        WebkitOverflowScrolling: 'touch',
        minWidth: 0
      }}>
        <div style={{ 
          fontWeight:700, 
          marginBottom:16, 
          fontSize:18,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>📊</span>
          <span>Full Feature Comparison</span>
        </div>
        <div style={{ 
          display:'grid', 
          gridTemplateColumns:`1.4fr repeat(${plans.length}, 1fr)`, 
          alignItems:'stretch', 
          gap:1,
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          minWidth: '600px' // Minimum width to enable horizontal scroll on mobile
        }}>
          {(() => {
            const isLightTheme = document.documentElement.classList.contains('light-theme');
            return (
              <>
                {/* Header row */}
                <div style={{ 
                  padding:'14px 16px', 
                  fontWeight:600, 
                  background: isLightTheme ? 'rgba(241, 243, 245, 0.8)' : 'rgba(0,0,0,.3)',
                  fontSize: 13
                }}>
                  Features
                </div>
                {plans.map(p => (
                  <div 
                    key={p.key} 
                    style={{ 
                      padding:'14px 16px', 
                      fontWeight:600, 
                      textAlign:'center',
                      background: p.recommended 
                        ? (isLightTheme ? 'rgba(0, 186, 206, 0.12)' : 'rgba(0, 186, 206, 0.1)')
                        : (isLightTheme ? 'rgba(241, 243, 245, 0.8)' : 'rgba(0,0,0,.3)'),
                      fontSize: 13,
                      borderLeft: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRight: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)'
                    }}
                  >
                    {p.name === 'Starter (Free)' ? 'Starter' : p.name}
                  </div>
                ))}
                {/* Rows */}
                {featureMatrix.map((row, idx) => {
                  const isHovered = hoveredRow === idx;
                  const getRowBackground = (isEven, isRecommended) => {
                    if (isHovered) {
                      return isLightTheme 
                        ? 'rgba(0, 186, 206, 0.15)' 
                        : 'rgba(0, 186, 206, 0.12)';
                    }
                    if (isRecommended) {
                      return isEven 
                        ? (isLightTheme ? 'rgba(0, 186, 206, 0.1)' : 'rgba(0, 186, 206, 0.08)')
                        : (isLightTheme ? 'rgba(0, 186, 206, 0.06)' : 'rgba(0, 186, 206, 0.05)');
                    }
                    return isEven 
                      ? (isLightTheme ? 'rgba(249, 250, 251, 0.6)' : 'rgba(0,0,0,.15)')
                      : (isLightTheme ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0,0,0,.05)');
                  };
                  
                  return (
                    <React.Fragment key={idx}>
                      <div 
                        style={{ 
                          padding:'12px 16px', 
                          background: getRowBackground(idx % 2 === 0, false),
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'background 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={() => setHoveredRow(idx)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {row.label}{row.suffix || ''}
                      </div>
                      {plans.map(p => (
                        <div 
                          key={p.key+idx} 
                          style={{ 
                            padding:'12px 16px', 
                            textAlign:'center',
                            background: getRowBackground(idx % 2 === 0, p.recommended),
                            fontSize: 13,
                            borderLeft: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)',
                            borderRight: p.recommended ? '2px solid var(--primary)' : '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          {(() => {
                            const value = row.keys[p.key];
                            // Handle undefined values - try alternative keys
                            const actualValue = value !== undefined ? value : 
                              (p.key === 'сore' ? row.keys['core'] : 
                               p.key === 'core' ? row.keys['сore'] : 
                               undefined);
                            
                            if (actualValue === undefined) {
                              return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;
                            }
                            
                            if (typeof actualValue === 'boolean') {
                              return actualValue ? (
                                <span style={{ fontSize: 16 }}>✓</span>
                              ) : (
                                <span style={{ color: 'var(--muted)' }}>—</span>
                              );
                            }
                            
                            return (
                              <span style={{ fontSize: 12, fontWeight: 500 }}>{actualValue}</span>
                            );
                          })()}
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>

      {/* Upgrade Confirmation Modal */}
      <Modal 
        open={confirmUpgrade.open} 
        title="Confirm Subscription Upgrade"
        onClose={() => setConfirmUpgrade({ open: false, plan: null })}
      >
        {confirmUpgrade.plan && (
          <div style={{ 
            display: "grid", 
            gap: 20,
            padding: "8px 0"
          }}>
            <div style={{
              padding: 16,
              borderRadius: 8,
              background: isLightTheme 
                ? 'rgba(0, 186, 206, 0.08)' 
                : 'rgba(0, 186, 206, 0.12)',
              border: `1px solid ${isLightTheme 
                ? 'rgba(0, 186, 206, 0.2)' 
                : 'rgba(0, 186, 206, 0.3)'}`
            }}>
              <div style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                marginBottom: 8,
                color: 'var(--text)'
              }}>
                {confirmUpgrade.plan.name}
              </div>
              {confirmUpgrade.plan.subtitle && (
                <div style={{ 
                  fontSize: 13, 
                  color: 'var(--muted)', 
                  marginBottom: 12 
                }}>
                  {confirmUpgrade.plan.subtitle}
                </div>
              )}
              <div style={{ 
                fontSize: 24, 
                fontWeight: 700,
                color: 'var(--primary)'
              }}>
                ${monthly ? confirmUpgrade.plan.priceMonthly : confirmUpgrade.plan.priceYearly}
                <span style={{ 
                  fontSize: 14, 
                  fontWeight: 400,
                  color: 'var(--muted)',
                  marginLeft: 4
                }}>
                  /{monthly ? 'month' : 'year'}
                </span>
              </div>
              {(() => {
                // Calculate savings dynamically based on current period
                const savings = !monthly && confirmUpgrade.plan.key !== 'starter' && confirmUpgrade.plan.priceMonthly && confirmUpgrade.plan.priceYearly
                  ? `Save $${Math.round((confirmUpgrade.plan.priceMonthly * 12 - confirmUpgrade.plan.priceYearly))}/year`
                  : null;
                
                return savings && (
                  <div style={{ 
                    fontSize: 12, 
                    color: 'var(--success)',
                    marginTop: 8,
                    fontWeight: 500
                  }}>
                    {savings}
                  </div>
                );
              })()}
            </div>

            <div style={{
              padding: 16,
              borderRadius: 8,
              background: isLightTheme 
                ? 'rgba(249, 250, 251, 0.6)' 
                : 'rgba(0, 0, 0, 0.2)',
              border: `1px solid var(--border)`
            }}>
              <div style={{ 
                fontSize: 14, 
                fontWeight: 600, 
                marginBottom: 12,
                color: 'var(--text)'
              }}>
                What's included:
              </div>
              <ul style={{ 
                margin: 0, 
                paddingLeft: 20, 
                display: "grid", 
                gap: 8,
                color: 'var(--text)'
              }}>
                {confirmUpgrade.plan.features?.slice(0, 5).map((feature, idx) => (
                  <li key={idx} style={{ fontSize: 13, lineHeight: 1.6 }}>
                    {feature}
                  </li>
                ))}
                {confirmUpgrade.plan.features?.length > 5 && (
                  <li style={{ fontSize: 13, color: 'var(--muted)' }}>
                    +{confirmUpgrade.plan.features.length - 5} more features
                  </li>
                )}
              </ul>
            </div>

            <div style={{
              padding: 12,
              borderRadius: 8,
              background: isLightTheme 
                ? 'rgba(255, 193, 7, 0.1)' 
                : 'rgba(255, 193, 7, 0.15)',
              border: `1px solid ${isLightTheme 
                ? 'rgba(255, 193, 7, 0.3)' 
                : 'rgba(255, 193, 7, 0.4)'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12
            }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                Your subscription will be updated immediately. You'll be charged the new rate starting from your next billing cycle.
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: 12,
              paddingTop: 8,
              borderTop: '1px solid var(--border)'
            }}>
              <button 
                className="btn secondary" 
                onClick={() => setConfirmUpgrade({ open: false, plan: null })}
                style={{ minWidth: 100 }}
              >
                Cancel
              </button>
              <button 
                className="btn primary" 
                onClick={() => handleUpgrade(confirmUpgrade.plan.id)}
                disabled={upgrading === confirmUpgrade.plan.id}
                style={{ minWidth: 140 }}
              >
                {upgrading === confirmUpgrade.plan.id 
                  ? 'Processing...' 
                  : `Confirm Upgrade`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ===== PAYMENT HISTORY TAB =====
const SUBSCRIPTION_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
  { value: "pending", label: "Pending" },
];

function PaymentHistory() {
  const [payments, setPayments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [filters, setFilters] = React.useState({
    subscription_status: "",
    start_date: "",
    end_date: "",
    payment_type: "",
  });

  const PER_PAGE = 20;

  const loadPayments = React.useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const result = await SubscriptionApi.getPaymentHistory({
        page: pageNum,
        per_page: PER_PAGE,
        subscription_status: filters.subscription_status,
        start_date: filters.start_date || null,
        end_date: filters.end_date || null,
        payment_type: filters.payment_type,
      });

      // API returns { invoices: [...], pagination: {...} }
      const items = result?.invoices || result?.result?.invoices || [];
      const pagination = result?.pagination || result?.result?.pagination || {};
      const totalItems = pagination.total_records || items.length;
      
      if (append) {
        setPayments((prev) => [...prev, ...items]);
      } else {
        setPayments(items);
      }

      setHasMore(pageNum * PER_PAGE < totalItems);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load payment history:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  React.useEffect(() => {
    loadPayments(1, false);
  }, [loadPayments]);

  const handleLoadMore = () => {
    loadPayments(page + 1, true);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    loadPayments(1, false);
  };

  const handleClearFilters = () => {
    setFilters({
      subscription_status: "",
      start_date: "",
      end_date: "",
      payment_type: "",
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    try {
      // API returns timestamps in milliseconds
      const date = new Date(typeof timestamp === "number" ? timestamp : parseInt(timestamp, 10));
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatAmount = (amount, currency = "USD") => {
    if (amount == null || amount === 0) return "—";
    const curr = currency?.toUpperCase() || "USD";
    // amount_paid is in cents
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(amount / 100);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      active: { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e" },
      succeeded: { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e" },
      paid: { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e" },
      past_due: { bg: "rgba(251, 146, 60, 0.15)", color: "#fb923c" },
      canceled: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
      failed: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
      trialing: { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" },
      unpaid: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
      incomplete: { bg: "rgba(251, 146, 60, 0.15)", color: "#fb923c" },
      incomplete_expired: { bg: "rgba(107, 114, 128, 0.15)", color: "#6b7280" },
      paused: { bg: "rgba(107, 114, 128, 0.15)", color: "#6b7280" },
      pending: { bg: "rgba(251, 146, 60, 0.15)", color: "#fb923c" },
    };
    const style = statusColors[status?.toLowerCase()] || { bg: "rgba(107, 114, 128, 0.15)", color: "#6b7280" };
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "capitalize",
          background: style.bg,
          color: style.color,
        }}
      >
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Filters */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Filters</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>Status</label>
            <select
              value={filters.subscription_status}
              onChange={(e) => handleFilterChange("subscription_status", e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 13,
                minWidth: 160,
              }}
            >
              {SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>Start Date</label>
            <DatePicker
              value={filters.start_date}
              onChange={(val) => handleFilterChange("start_date", val)}
              placeholder="Start date"
              maxDate={filters.end_date || undefined}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>End Date</label>
            <DatePicker
              value={filters.end_date}
              onChange={(val) => handleFilterChange("end_date", val)}
              placeholder="End date"
              minDate={filters.start_date || undefined}
            />
          </div>

        
        </div>
      </div>

      {/* Payment List */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            Loading payment history...
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            No payment history found.
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Plan</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Billing</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, idx) => (
                    <tr
                      key={payment.id || idx}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: idx % 2 === 0 ? "transparent" : "var(--bg-secondary)",
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>{formatDate(payment.subscription_start_date || payment.created_at)}</td>
                      <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>
                        {payment.plan_name || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>
                        {payment.billing_cycle || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                        {formatAmount(payment.amount_paid, payment.currency)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>{getStatusBadge(payment.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div style={{ padding: 16, textAlign: "center", borderTop: "1px solid var(--border)" }}>
                <button
                  className="btn outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


