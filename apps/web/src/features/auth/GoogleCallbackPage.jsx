// The backend redirects here as /auth/google/callback#token=...&remember=1

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';

export default function GoogleCallbackPage() {
    const { loginWithToken } = useAuth();
    const navigate = useNavigate();
    const handled = useRef(false); // StrictMode runs effects twice in dev → only handle once

    useEffect(() => {
        if (handled.current) return;
        handled.current = true;

        const params = new URLSearchParams(window.location.hash.slice(1));
        const token = params.get('token');
        // Remove the token from the address bar / browser history
        window.history.replaceState(null, '', window.location.pathname);

        if (!token) {
            navigate('/login?error=google', { replace: true });
            return;
        }
        loginWithToken(token, params.get('remember') === '1');
        navigate('/', { replace: true });
    }, [loginWithToken, navigate]);

    return (
        <div className="page-centered fitness-page-bg">
            <p className="status-loading">Signing you in…</p>
        </div>
    );
}