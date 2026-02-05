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
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal.jsx";

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

    try {
      // Спочатку переходимо на сторінку логіну
      if (typeof window !== 'undefined') {
        if (window.location.hash) {
          // Для hash‑router міняємо hash
          window.location.hash = '/login';
        } else {
          // Fallback – повний редірект
          const base = window.location.origin + window.location.pathname;
          window.location.href = `${base}#/login`;
        }
        // Після редіректу робимо повне перезавантаження, щоб очистити весь стан SPA
        setTimeout(() => {
          try {
            window.location.reload();
          } catch {}
        }, 0);
      } else {
        // На всяк випадок – SPA‑навігація
        navigate("/login", { replace: true });
      }
    } catch {
      // Якщо щось пішло не так з window.location – просто навігуємо та перезавантажуємо
      navigate("/login", { replace: true });
      try {
        window.location.reload();
      } catch {}
    }
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
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [memberToDelete, setMemberToDelete] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const { showSuccess, showError } = useNotifications();

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
        }
        
        // Встановлюємо активного користувача:
        // 1. Спочатку перевіряємо localStorage
        // 2. Якщо немає в localStorage, перевіряємо, чи поточний користувач відповідає якомусь члену сім'ї
        // 3. Якщо нічого не знайдено, встановлюємо primary
        try {
          const stored = localStorage.getItem("active_family_member_id");
          if (stored && stored.trim() !== "") {
            // Перевіряємо, чи збережений ID існує в списку членів сім'ї
            const storedMember = list.find((m) => {
              const switchId = m.family_member_id || m.profile_id || m.id;
              return String(switchId) === String(stored);
            });
            if (storedMember) {
              setActiveFamilyId(stored);
            } else {
              // Якщо збережений ID не знайдено, встановлюємо primary
              setActiveFamilyId(primary?.id || null);
            }
          } else {
            // Якщо немає в localStorage, перевіряємо, чи поточний користувач відповідає якомусь члену сім'ї
            const currentUserMember = list.find((m) => {
              const switchId = m.family_member_id || m.profile_id || m.id;
              return String(switchId) === String(user.id) || 
                     String(m.profile_id) === String(user.id) ||
                     String(m.user_id) === String(user.id);
            });
            if (currentUserMember) {
              const switchId = currentUserMember.family_member_id || currentUserMember.profile_id || currentUserMember.id;
              setActiveFamilyId(String(switchId));
            } else {
              // Якщо нічого не знайдено, встановлюємо primary
              setActiveFamilyId(primary?.id || null);
            }
          }
        } catch (err) {
          // Якщо помилка з localStorage, встановлюємо primary
          setActiveFamilyId(primary?.id || null);
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
      const newActiveId = memberId || primaryFamilyId || null;
      setActiveFamilyId(newActiveId);
      try {
        localStorage.setItem("active_family_member_id", newActiveId ? String(newActiveId) : "");
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

  const handleDeleteMember = async () => {
    if (!memberToDelete?.id) return;
    
    try {
      setDeleting(true);
      await SubscriptionApi.removeFamilyMember(memberToDelete.id);
      showSuccess("Family member deleted successfully");
      
      setDeleteModalOpen(false);
      setMemberToDelete(null);
      
      // Перезавантажуємо сторінку після успішного видалення
      try {
        window.location.reload();
      } catch {}
    } catch (err) {
      console.error("Failed to delete family member:", err);
      showError(err?.message || "Failed to delete family member. Please try again.");
      setDeleting(false);
    }
  };

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
      m.name ||
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
              const first = (user?.first_name || user?.firstName || profileData?.first_name || profileData?.firstName || '').toString();
              const last = (user?.last_name || user?.lastName || profileData?.last_name || profileData?.lastName || '').toString();
              const fullName = (user?.name || profileData?.name || '').toString();
              
              // Якщо є first_name та last_name, показуємо їх
              if (first && last) {
                return `${first} ${last}`;
              }
              // Якщо є тільки first_name
              if (first) {
                return first;
              }
              // Якщо є повне ім'я
              if (fullName) {
                return fullName;
              }
              // Якщо немає імені, показуємо email або "User"
              return user?.email || profileData?.email || 'User';
            })()}
          </div>
          <div style={{ fontSize:12, color:'#666', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {(() => {
              // 🔍 DEBUG: Перевірка джерела email для відображення
              const emailToShow = user?.email || profileData?.email || '—';
              console.log('🔍 [DEBUG] Email для відображення в меню:', {
                fromUser: user?.email,
                fromProfileData: profileData?.email,
                finalEmail: emailToShow,
                userObject: user ? { id: user.id, email: user.email, keys: Object.keys(user) } : null,
                profileDataObject: profileData ? { id: profileData.id, email: profileData.email, keys: Object.keys(profileData) } : null,
              });
              return emailToShow;
            })()}
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
              className={`btn outline small ${!activeFamilyId || (primaryFamilyId && String(activeFamilyId) === String(primaryFamilyId)) ? "active" : ""}`}
              onClick={() => handleSwitchMember(null)}
              disabled={familyLoading}
              style={{
                justifyContent: "space-between",
                display: "flex",
                background:
                  !activeFamilyId || (primaryFamilyId && String(activeFamilyId) === String(primaryFamilyId))
                    ? "rgba(0, 186, 206, 0.08)"
                    : "transparent",
                borderColor:
                  !activeFamilyId || (primaryFamilyId && String(activeFamilyId) === String(primaryFamilyId))
                    ? "var(--primary)"
                    : "var(--border, #ececec)",
              }}
            >
              <span>You (primary)</span>
            </button>
            {familyMembers.map((member) => {
              const name =
                member.name ||
                member.family_member_name ||
                [member.first_name, member.last_name].filter(Boolean).join(" ") ||
                "Family member";
              const switchId =
                member.family_member_id ||
                member.profile_id ||
                member.id;
              // Пропускаємо primary користувача, він вже відображається окремо
              if (switchId && primaryFamilyId && String(switchId) === String(primaryFamilyId)) return null;
              
              // Перевіряємо, чи цей член сім'ї зараз активний
              const isActive = activeFamilyId && switchId && String(activeFamilyId) === String(switchId);
              
              // Перевіряємо, чи можна видалити (role === "member")
              const canDelete = member.role === "member";
              const memberIdToDelete = member.family_member_id || member.id;
              
              return (
                <div
                  key={member.id || switchId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    className={`btn outline small ${isActive ? "active" : ""}`}
                    onClick={() => handleSwitchMember(switchId)}
                    disabled={familyLoading}
                    style={{
                      flex: 1,
                      justifyContent: "space-between",
                      display: "flex",
                      background:
                        isActive
                          ? "rgba(0, 186, 206, 0.08)"
                          : "transparent",
                      borderColor:
                        isActive
                          ? "var(--primary)"
                          : "var(--border, #ececec)",
                    }}
                  >
                    <span>{name}</span>
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToDelete({ id: memberIdToDelete, name });
                        setDeleteModalOpen(true);
                      }}
                      disabled={familyLoading || deleting}
                      style={{
                        padding: "4px 8px",
                        background: "transparent",
                        border: "none",
                        color: "var(--error, #dc2626)",
                        cursor: familyLoading || deleting ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        opacity: familyLoading || deleting ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "opacity 0.2s ease",
                      }}
                      title="Delete family member"
                      onMouseEnter={(e) => {
                        if (!familyLoading && !deleting) {
                          e.currentTarget.style.opacity = "0.8";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!familyLoading && !deleting) {
                          e.currentTarget.style.opacity = "1";
                        }
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}
            {familyLoading && (
              <div style={{ fontSize:11, color:"#777" }}>Loading family profiles...</div>
            )}
          </div>
        </div>
      )}
      <button className="btn outline" style={{ width:'100%' }} onClick={onLogout}>Log out</button>
      
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
            setMemberToDelete(null);
          }
        }}
        onConfirm={handleDeleteMember}
        title="Delete Family Member"
        message={`Are you sure you want to delete "${memberToDelete?.name || 'this family member'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleting}
      />
    </div>
  );
}


