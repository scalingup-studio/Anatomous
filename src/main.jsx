// main.jsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./api/AuthContext.jsx";
import { NotificationProvider } from "./api/NotificationContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { LoginPage } from "./pages/Login.jsx";
import { SignupPage } from "./pages/Signup.jsx";
import OAuthCallbackGoogle from "./pages/OAuthCallbackGoogle.jsx";
import DashboardLayout from "./routes/DashboardLayout.jsx";
import DashboardHome from "./routes/pages/Home.jsx";
import DashboardInsights from "./routes/pages/Insights.jsx";
import DashboardWorkouts from "./routes/pages/Workouts.jsx";
import DashboardNutrition from "./routes/pages/Nutrition.jsx";
import DashboardGoals from "./routes/pages/Goals.jsx";
import DashboardProfile from "./routes/pages/Profile.jsx";
import DashboardSettings from "./routes/pages/Settings.jsx";
import DashboardReports from "./routes/pages/Reports.jsx";
import SharedReportPage from "./routes/pages/SharedReport.jsx";
import HelpCenterPage from "./routes/pages/HelpCenter.jsx";
import SubscriptionsPage from "./routes/pages/Subscriptions.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage-TEST.jsx";
import OnboardingPage from "./routes/OnboardingLayout.jsx";
import Logout from "./pages/Logout.jsx";

import "./index.css";

// 🔐 Component for authorization verification
function PrivateRoute({ children }) {
  const { authToken, loading, user } = useAuth();

  // console.log('PrivateRoute - authToken:', authToken);
  // console.log('PrivateRoute - loading:', loading);
  // console.log('PrivateRoute - user:', user);

  if (loading) return <p>Loading…</p>;
  if (!authToken) {
    console.log('No authToken - redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// 🔄 Component for automatic redirection between onboarding and dashboard
function AutoRedirectRoute() {
  const { user, loading, hasCompletedOnboarding, isNewUser } = useAuth();
  
  // Check onboarding status once
  const onboardingCompleted = hasCompletedOnboarding();
  
  console.log('🔄 AutoRedirectRoute - Debug info:', {
    loading,
    isNewUser,
    user: user ? {
      id: user.id,
      email: user.email,
      completed: user.completed,
      onboarding_completed: user.onboarding_completed,
    } : null,
    hasCompletedOnboardingResult: onboardingCompleted
  });
  
  if (loading) {
    console.log('⏳ AutoRedirectRoute - Still loading...');
    return <p>Loading…</p>;
  }
  
  // Scenario 1: New user after signup - redirect to onboarding
  if (isNewUser) {
    console.log('📝 AutoRedirectRoute - New user from signup, redirecting to /onboarding');
    return <Navigate to="/onboarding" replace />;
  }
  
  // For existing users, always redirect to dashboard
  // Modal on Overview page will handle prompting for incomplete onboarding
  console.log('🎯 AutoRedirectRoute - Redirecting to /dashboard');
  return <Navigate to="/dashboard" replace />;
}

function AppRouter() {
  // Bridge non-hash direct URLs to HashRouter before react renders routes
  try {
    const path = window.location.pathname || "";
    const match = path.match(/\/shared-reports\/([^\/?#]+)/);
    if (match && !window.location.hash.includes('/shared-reports/')) {
      const token = match[1];
      const base = path.split('/shared-reports/')[0] || '/';
      const target = `${base}#/shared-reports/${token}`;
      window.location.replace(target);
      return null;
    }
  } catch {}
  return (
    <HashRouter future={{ v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage open />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/logout" element={<Logout />} />

        {/* ✅ Google OAuth callback route */}
        <Route path="/auth/callback/google" element={<OAuthCallbackGoogle />} />
        <Route path="/auth/success" element={<OAuthCallbackGoogle />} />

        {/* Public shared report viewer */}
        <Route path="/shared-reports/:token" element={<SharedReportPage />} />

        {/* 🔐 Onboarding page - only for non-completed users */}
        <Route 
          path="/onboarding" 
          element={
            <PrivateRoute>
              <OnboardingGuard>
                <OnboardingPage />
              </OnboardingGuard>
            </PrivateRoute>
          } 
        />

       {/* Automatic redirect from root */}
        <Route path="/" element={<PrivateRoute><AutoRedirectRoute /></PrivateRoute>} />

       {/* 🔐 Protected Dashboard - for advanced users only */}
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute>
              <DashboardGuard>
                <DashboardLayout />
              </DashboardGuard>
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          {/* Analytics route removed */}
          <Route path="insights" element={<DashboardInsights />} />
          <Route path="goals" element={<DashboardGoals />} />
          <Route path="workouts" element={<DashboardWorkouts />} />
          <Route path="nutrition" element={<DashboardNutrition />} />
          <Route path="reports" element={<DashboardReports />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="help" element={<HelpCenterPage />} />
          <Route path="profile" element={<DashboardProfile />} />
          <Route path="settings" element={<DashboardSettings />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

// 🛡️ Захисник для onboarding - не дозволяє доступ якщо вже завершено
function OnboardingGuard({ children }) {
  const { user, loading, hasCompletedOnboarding, isNewUser } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const force = params.get('force') === 'true';
  
  // Check onboarding status once
  const onboardingCompleted = hasCompletedOnboarding();
  
  console.log('🛡️ OnboardingGuard - Debug info:', {
    loading,
    isNewUser,
    user: user ? {
      id: user.id,
      email: user.email,
      onboarding_completed: user.onboarding_completed
    } : null,
    hasCompletedOnboardingResult: onboardingCompleted
  });
  
  if (loading) {
    console.log('⏳ OnboardingGuard - Still loading...');
    return <p>Loading…</p>;
  }
  
  // Якщо onboarding вже завершено - перенаправляємо на dashboard (крім форс-режиму)
  if (onboardingCompleted && !force) {
    console.log('🎯 OnboardingGuard - Onboarding already completed, redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('📝 OnboardingGuard - Allowing access to onboarding', { forceMode: force });
  return children;
}

function DashboardGuard({ children }) {
  const { user, loading, hasCompletedOnboarding, isNewUser } = useAuth();
  const location = useLocation();
  
  // Check onboarding status once
  const onboardingCompleted = hasCompletedOnboarding();
  
  console.log('🛡️ DashboardGuard - Debug info:', {
    loading,
    isNewUser,
    pathname: location.pathname,
    user: user ? {
      id: user.id,
      email: user.email,
      onboarding_completed: user.onboarding_completed
    } : null,
    hasCompletedOnboardingResult: onboardingCompleted
  });
  
  if (loading) {
    console.log('⏳ DashboardGuard - Still loading...');
    return <p>Loading…</p>;
  }
  
  // Allow access to dashboard even if onboarding is not completed
  // The modal on Overview page will handle prompting users to complete onboarding
  // This allows users to access profile and other dashboard pages
  console.log('🎯 DashboardGuard - Allowing access to dashboard (onboarding check disabled for dashboard access)');
  return children;
}
// 🔒 Wrap entire app in AuthProvider, NotificationProvider, and ThemeProvider
ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <AuthProvider>
      <NotificationProvider>
        <AppRouter />
      </NotificationProvider>
    </AuthProvider>
  </ThemeProvider>
);