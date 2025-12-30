import React from "react";
import { Logo } from "../components/Logo.jsx";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import NotificationSystem from "../components/NotificationSystem.jsx";
import { useNotifications } from "../api/NotificationContext.jsx";
import { ProfilesApi } from "../api/profilesApi.js";
import { SubscriptionApi } from "../api/subscriptionApi.js";
import { hasFeatureAccess } from "../utils/subscriptionUtils.js";
import { ThemeToggle } from "../components/ThemeToggle.jsx";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { logout } = useAuth();
  const { notifications, removeNotification, showError } = useNotifications();
  const dashContentRef = React.useRef(null);

  const handleLogOut = async () => {

    await logout();

    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    localStorage.removeItem('refresh_token');

    navigate("/login");
  }

  const scrollToTop = () => {
    if (dashContentRef.current) {
      dashContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Fallback: scroll window if ref not available
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Викликаємо /family/members один раз при завантаженні сторінки (для ініціалізації бекенду)
  React.useEffect(() => {
    (async () => {
      try {
        await SubscriptionApi.getFamilyMembers({
          status: "active",
          include_profiles: true,
          per_page: 20,
        });
        try {
        } catch {}
      } catch (err) {
        console.error("Failed initial family/members call:", err);
      }
    })();
  }, []);

  React.useEffect(() => { 
    setMenuOpen(false);
    // Scroll to top when route changes
    scrollToTop();
  }, [location.pathname]);

  // Виклик family/members при завантаженні сторінки (один раз)
  React.useEffect(() => {
    (async () => {
      try {
        const res = await SubscriptionApi.getFamilyMembers({
          status: "active",
          include_profiles: true,
          per_page: 20,
        });
        try {
        } catch {}
      } catch (err) {
        console.error("Failed initial family members fetch:", err);
      }
    })();
  }, []);

  // Lock body scroll when sidebar is open
  React.useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Global error handler for API errors with success: false
  React.useEffect(() => {
    const handleUnhandledRejection = (event) => {
      const error = event.reason;
      if (!error) return;
      
      // Check if it's an ApiError with success: false and error field
      // Check both top level and nested structures (e.g., guard_info.check_result)
      let errorMessage = null;
      
      if (error.data) {
        // Check top level
        if (error.data.success === false && error.data.error) {
          errorMessage = error.data.message || error.message || error.data.error || 'An error occurred';
        }
        // Check nested structures like guard_info.check_result
        else if (error.data.guard_info && error.data.guard_info.check_result) {
          const checkResult = error.data.guard_info.check_result;
          if (checkResult.success === false && checkResult.error) {
            errorMessage = checkResult.message || checkResult.error || error.data.message || error.message || 'An error occurred';
          }
        }
        // Also check for blocked responses
        else if (error.data.blocked === true && error.data.guard_info && error.data.guard_info.check_result) {
          const checkResult = error.data.guard_info.check_result;
          if (checkResult.success === false && checkResult.error) {
            errorMessage = checkResult.message || checkResult.error || error.data.message || error.message || 'An error occurred';
          }
        }
      }
      
      if (errorMessage) {
        showError(errorMessage);
        // Prevent default browser error handling
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [showError]);
  return (
    <div className={`dash-layout ${menuOpen ? "menu-open" : ""}`}>
      <header className="dash-header">
        <Logo height={28} />
      </header>
      <button className={`hamburger ${menuOpen ? 'open' : ''}`} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="sidebar" onClick={() => setMenuOpen(v => !v)}>
        <span />
        <span />
        <span />
      </button>
      <aside id="sidebar" className="dash-sidebar" role="navigation" style={{ display:'flex', flexDirection:'column' }}>
        <div className="dash-brand" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Logo height={28} />
        </div>
        {/* Top group */}
        <div className="dash-nav" style={{ flex: 1 }}>
          <NavLink end className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard" onClick={scrollToTop}>Overview</NavLink>
          <NavLink className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard/profile" onClick={scrollToTop}>Profile</NavLink>
          <NavLink className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard/insights" onClick={scrollToTop}>Insights</NavLink>
          <NavLink className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard/goals" onClick={scrollToTop}>Goals</NavLink>
          <NavLink className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard/notes" onClick={scrollToTop}>Notes</NavLink>
          {/* Hidden per request: Workouts & Nutrition */}
          <NavLink className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard/reports" onClick={scrollToTop}>Reports</NavLink>
        </div>

        {/* Bottom group (above user info) */}

        <div className="dash-nav" style={{ borderTop:'1px solid var(--border, #ececec)', paddingTop:8 }}>
          <NavLink className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard/subscriptions" onClick={scrollToTop}>Subscriptions</NavLink>

          <NavLink className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard/settings" onClick={scrollToTop}>Settings</NavLink>
          <NavLink className={({ isActive }) => `dash-link ${isActive ? "active" : ""}`} to="/dashboard/help" onClick={scrollToTop}>Help Center</NavLink>
        </div>
        <UserSummaryAndLogout onLogout={handleLogOut} />
      </aside>
      {menuOpen && <div className="dash-backdrop" onClick={() => setMenuOpen(false)} />}
      <section className="dash-content" ref={dashContentRef}>
        <div className="dash-toolbar" />
        <Outlet />
      </section>
      
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      {/* Fixed Theme Toggle in top right corner */}
      <div className="theme-toggle-container" style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <ThemeToggle showLabel={false} size="small" />
      </div>
    </div>
  );
}

function UserSummaryAndLogout({ onLogout }) {
  const { user } = useAuth();
  const initials = (user?.first_name || user?.name || '?')[0]?.toUpperCase() + (user?.last_name?.[0]?.toUpperCase() || '');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [profileData, setProfileData] = React.useState(null);
  const [familyMembers, setFamilyMembers] = React.useState([]);
  const [familyLoading, setFamilyLoading] = React.useState(false);
  const [activeFamilyId, setActiveFamilyId] = React.useState(null);
  const [primaryFamilyId, setPrimaryFamilyId] = React.useState(null);

  // Helper to extract a usable URL from various shapes
  const getPhotoUrl = (obj) => {
    if (!obj) return '';
    if (obj.avatar) return obj.avatar;
    if (obj.photo_url) return obj.photo_url;
    const pp = obj.profile_photo;
    if (typeof pp === 'string') return pp;
    if (pp && (pp.url || pp.path)) return pp.url || pp.path;
    return '';
  };

  // Derive avatar from user first, then try fetching profile
  React.useEffect(() => {
    const direct = getPhotoUrl(user);
    if (direct) {
      setAvatarUrl(direct);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!user?.id) return;
        const profile = await ProfilesApi.getById(user.id);
        if (cancelled) return;
        setProfileData(profile || null);
        const url = getPhotoUrl(profile);
        if (url) setAvatarUrl(url);
      } catch {
        // silently ignore
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const hasFamilySharing = React.useMemo(() => {
    return hasFeatureAccess(user, "familySharing");
  }, [user]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadFamilyMembers() {
      if (!user?.id) {
        try {
        } catch {}
        return;
      }
      if (!hasFamilySharing) {
        // Якщо підписка більше не сімейна — очищаємо локальний стан і не показуємо блок
        setFamilyMembers([]);
        setPrimaryFamilyId(null);
        setActiveFamilyId(null);
        return;
      }
      try {
        setFamilyLoading(true);
        const res = await SubscriptionApi.getFamilyMembers({ status: "active", include_profiles: true, per_page: 20 });
        const base = res?.result || res || {};
        const items = base.items || base;
        try {
        } catch {}
        if (cancelled) return;
        const list = Array.isArray(items) ? items : [];
        setFamilyMembers(list);
        const primary =
          list.find((m) => m.role === "Owner" || m.profile_type === "primary") ||
          null;
        if (primary?.id) {
          setPrimaryFamilyId(primary.id);
          setActiveFamilyId(primary.id);
        }
      } catch (err) {
        console.error("Failed to load family members:", err);
      } finally {
        if (!cancelled) setFamilyLoading(false);
      }
    }

    loadFamilyMembers();
    return () => {
      cancelled = true;
    };
  }, [user, hasFamilySharing]);

  const handleSwitchMember = async (memberId) => {
    try {
      if (!primaryFamilyId && !memberId) return;
      setFamilyLoading(true);
      const idToSend = memberId || primaryFamilyId;
      try {
      } catch {}
      await SubscriptionApi.switchFamilyMember(idToSend);
      setActiveFamilyId(memberId || primaryFamilyId || null);
      try {
        localStorage.setItem("active_family_member_id", memberId ? String(memberId) : "");
      } catch {}
      // Після успішного перемикання повністю перезавантажуємо сторінку,
      // щоб усі дані/контексти оновилися під новий профіль
      try {
        window.location.reload();
      } catch {}
    } catch (err) {
      console.error("Failed to switch family member:", err);
    } finally {
      setFamilyLoading(false);
    }
  };

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("active_family_member_id");
      if (stored) {
        setActiveFamilyId(stored);
      }
    } catch {}
  }, []);

  const activeProfileLabel = React.useMemo(() => {
    if (!hasFamilySharing) return null;
    if (!familyMembers || familyMembers.length === 0) return null;
    if (!activeFamilyId || activeFamilyId === String(primaryFamilyId)) {
      return "You (primary)";
    }
    const m = familyMembers.find((member) => {
      const switchId =
        member.family_member_id ||
        member.profile_id ||
        member.id;
      return String(switchId) === String(activeFamilyId);
    });
    if (!m) return "You (primary)";
    return (
      m.family_member_name ||
      [m.first_name, m.last_name].filter(Boolean).join(" ") ||
      "Family member"
    );
  }, [hasFamilySharing, activeFamilyId, primaryFamilyId, familyMembers]);
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border, #ececec)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={(user?.first_name || user?.name || 'User') + ' avatar'}
            style={{ width:36, height:36, borderRadius:999, objectFit:'cover', background:'#eee' }}
          />
        ) : (
          <div style={{ width:36, height:36, borderRadius:999, background:'#ddd', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600 }}>
            {initials}
          </div>
        )}
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:600, lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {(() => {
              const first = (user?.first_name || user?.firstName || user?.name || profileData?.first_name || profileData?.firstName || '').toString();
              const lastInitial = ((user?.last_name || user?.lastName || profileData?.last_name || profileData?.lastName || '')?.[0] || '').toString();
              if (!first) return '';
              return `${first}${lastInitial ? ` ${lastInitial}.` : ''}`;
            })()}
          </div>
          <div style={{ fontSize:12, color:'#666', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {user?.email || profileData?.email || '—'}
          </div>
        </div>
      </div>
      {hasFamilySharing && familyMembers && familyMembers.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize:11, color:'#777', marginBottom:2 }}>Family profiles</div>
          {activeProfileLabel && (
            <div style={{ fontSize:11, color:'#999', marginBottom:4 }}>
              Active: <span style={{ fontWeight:600 }}>{activeProfileLabel}</span>
            </div>
          )}
          <div style={{ display:"grid", gap:4 }}>
            <button
              type="button"
              className={`btn outline small ${!activeFamilyId || activeFamilyId === String(primaryFamilyId) ? "active" : ""}`}
              onClick={() => handleSwitchMember(null)}
              disabled={familyLoading}
              style={{
                justifyContent: "space-between",
                display: "flex",
                background:
                  !activeFamilyId || activeFamilyId === String(primaryFamilyId)
                    ? "rgba(0, 186, 206, 0.08)"
                    : "transparent",
                borderColor:
                  !activeFamilyId || activeFamilyId === String(primaryFamilyId)
                    ? "var(--primary)"
                    : "var(--border, #ececec)",
              }}
            >
              <span>You (primary)</span>
            </button>
            {familyMembers.map((member) => {
              const name =
                member.family_member_name ||
                [member.first_name, member.last_name].filter(Boolean).join(" ") ||
                "Family member";
              const switchId =
                member.family_member_id ||
                member.profile_id ||
                member.id;
              if (switchId === primaryFamilyId) return null;
              return (
                <button
                  key={member.id || switchId}
                  type="button"
                  className={`btn outline small ${activeFamilyId === String(switchId) ? "active" : ""}`}
                  onClick={() => handleSwitchMember(switchId)}
                  disabled={familyLoading}
                  style={{
                    justifyContent: "space-between",
                    display: "flex",
                    background:
                      activeFamilyId === String(switchId)
                        ? "rgba(0, 186, 206, 0.08)"
                        : "transparent",
                    borderColor:
                      activeFamilyId === String(switchId)
                        ? "var(--primary)"
                        : "var(--border, #ececec)",
                  }}
                >
                  <span>{name}</span>
                </button>
              );
            })}
            {familyLoading && (
              <div style={{ fontSize:11, color:"#777" }}>Loading family profiles...</div>
            )}
          </div>
        </div>
      )}
      <button className="btn outline" style={{ width:'100%' }} onClick={onLogout}>Log out</button>
    </div>
  );
}


