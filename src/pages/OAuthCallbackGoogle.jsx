// src__pages__OAuthCallbackGoogle.jsx
/**
 * Fixed OAuth Callback Handler
 * Properly verifies token storage and handles errors
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import { tokenManager } from '../api/tokenManager';

export default function OAuthCallbackGoogle() {
  const navigate = useNavigate();
  const { setAuthToken, setUser, setIsNewUser } = useAuth();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Initializing...');
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        setStatus('Processing authentication...');
        // console.log('🔄 OAuth callback page loaded'); // SECURITY: Commented to prevent token leakage

        // Small delay to ensure cookies are set
        await new Promise(resolve => setTimeout(resolve, 500));

        setStatus('Getting authentication token...');
        // console.log('🔄 Calling refreshAuth to exchange cookie for token...'); // SECURITY: Commented to prevent token leakage

        // Use token manager to refresh (which uses the refresh_token cookie)
        const refreshResult = await tokenManager.refreshToken();

        // SECURITY: Commented to prevent token leakage - was logging token length
        // console.log('📋 refreshAuth result:', {
        //   hasToken: !!refreshResult.authToken,
        //   tokenLength: refreshResult.authToken?.length,
        // });

        if (!refreshResult.authToken) {
          throw new Error('Failed to get authentication token. The login session may have expired.');
        }

        // ✅ Verify token is stored in localStorage
        const storedToken = tokenManager.getToken();
        if (!storedToken) {
          throw new Error('Token was not properly stored. Please try logging in again.');
        }

        // Update auth context
        setAuthToken(refreshResult.authToken);
        setUser(refreshResult.user ?? null);
        
        // Check if this is a new user (onboarding not completed)
        // Use the same logic as hasCompletedOnboarding() in AuthContext
        const user = refreshResult.user ?? null;
        const onboardingCompleted = user ? (
          user.onboarding_completed ?? user.completed ?? 
          user.save_onboarding?.onboarding_completed ?? 
          user.save_onboarding?.completed ?? false
        ) : false;
        
        const isNewUser = !user || !onboardingCompleted;
        
        if (isNewUser) {
          // console.log('🆕 New user detected via Google OAuth - redirecting to onboarding'); // SECURITY: Commented
          setIsNewUser(true);
        } else {
          // console.log('👤 Existing user via Google OAuth - redirecting to dashboard'); // SECURITY: Commented
          setIsNewUser(false);
        }
        
        // Set flag to show onboarding modal after login (only for existing users)
        if (!isNewUser) {
          try {
            localStorage.setItem('showOnboardingModalAfterLogin', 'true');
          } catch {}
        }

        // console.log('✅ Authentication successful!'); // SECURITY: Commented
        setStatus('Success! Redirecting...');

        // Small delay so user sees success message
        await new Promise(resolve => setTimeout(resolve, 800));

        // Redirect based on user status
        if (isNewUser) {
          // console.log('🚀 Navigating to onboarding for new user...'); // SECURITY: Commented
          navigate('/onboarding', { replace: true });
        } else {
          // console.log('🚀 Navigating to root (AutoRedirectRoute will handle)...'); // SECURITY: Commented
          navigate('/', { replace: true });
        }

      } catch (err) {
        // SECURITY: Commented to prevent sensitive error data leakage
        // console.error('❌ OAuth callback error:', err);
        // console.error('Error details:', {
        //   message: err.message,
        //   status: err.status,
        //   data: err.data
        // });

        const errorMessage = err.message || 'Failed to complete Google login';
        setError(errorMessage);
        setDebugInfo({
          error: errorMessage,
          errorStatus: err.status,
          errorData: err.data
        });

        // Clear any partial auth state
        tokenManager.clearToken();
        setAuthToken(null);
        setUser(null);
        setIsNewUser(false);

        // Redirect to login after showing error
        // setTimeout(() => {
        //   navigate('/login', {
        //     replace: true,
        //     state: { error: errorMessage }
        //   });
        // }, 3000);
      }
    }

    // Delay to prevent double-execution in dev mode
    const timer = setTimeout(handleCallback, 200);
    return () => clearTimeout(timer);

  }, [navigate, setAuthToken, setUser, setIsNewUser]);

  if (error) {
    return (
      <div style={{
        maxWidth: 600,
        margin: '100px auto',
        padding: 24,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backgroundColor: '#111',
        color: '#fff'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>❌</div>
        <h3 style={{ color: '#ff4c4c', marginTop: 0, textAlign: 'center' }}>
          Authentication Failed
        </h3>
        <p style={{ color: '#ccc', marginBottom: 8, textAlign: 'center' }}>
          {error}
        </p>

        {debugInfo && (
          <details style={{ marginTop: 20, padding: 12, backgroundColor: '#1a1a1a', borderRadius: 4 }}>
            <summary style={{ cursor: 'pointer', color: '#00bace' }}>Debug Info</summary>
            <pre style={{ 
              fontSize: 11, 
              overflow: 'auto', 
              marginTop: 8,
              padding: 8,
              backgroundColor: '#0a0a0a',
              borderRadius: 4
            }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
        <p style={{ fontSize: 14, color: '#777', textAlign: 'center', marginTop: 16 }}>
          Redirecting to login in 3 seconds...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 400,
      margin: '100px auto',
      padding: 24,
      textAlign: 'center',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      backgroundColor: '#111',
      color: '#fff'
    }}>
      <h3 style={{ marginTop: 0, color: '#00bace' }}>
        Completing Sign-In
      </h3>
      <p style={{ color: '#ccc', marginBottom: 24 }}>{status}</p>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          border: '3px solid #222',
          borderTop: '3px solid #00bace',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>


      {/* {debugInfo && (
        <details style={{ marginTop: 20, padding: 12, backgroundColor: '#1a1a1a', borderRadius: 4, textAlign: 'left' }}>
          <summary style={{ cursor: 'pointer', color: '#00bace', textAlign: 'center' }}>Debug Info</summary>
          <pre style={{ 
            fontSize: 11, 
            overflow: 'auto', 
            marginTop: 8,
            padding: 8,
            backgroundColor: '#0a0a0a',
            borderRadius: 4
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )} */}

      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
