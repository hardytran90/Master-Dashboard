// The backend redirects here with a URL like /auth/strava/callback#token=...
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';

export default function StravaCallbackPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false); // StrictMode runs effects twice in dev → handle only once

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    // Remove the token from the address bar so it isn't kept in browser history
    window.history.replaceState(null, '', window.location.pathname);

    if (token) {
      loginWithToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login?error=strava', { replace: true });
    }
  }, [loginWithToken, navigate]);

  return (
    <div className="auth-page">
      <p className="sync-meta">Login with Strava…</p>
    </div>
  );
}
