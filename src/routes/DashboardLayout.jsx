import React from "react";
import { Logo } from "../components/Logo.jsx";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../api/AuthContext";
import NotificationSystem from "../components/NotificationSystem.jsx";
import { useNotifications } from "../api/NotificationContext.jsx";
import { ProfilesApi } from "../api/profilesApi.js";
import { ThemeToggle } from "../components/ThemeToggle.jsx";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { logout } = useAuth();
  const { notifications, removeNotification } = useNotifications();
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

  React.useEffect(() => { 
    setMenuOpen(false);
    // Scroll to top when route changes
    scrollToTop();
  }, [location.pathname]);
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
      <button className="btn outline" style={{ width:'100%' }} onClick={onLogout}>Log out</button>
    </div>
  );
}


