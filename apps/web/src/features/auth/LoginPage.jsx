import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { api } from '../../lib/api';
import { getRememberedEmail, setRememberedEmail } from '../../lib/tokenStorage';

// Error codes the backend appends as ?error=... when Strava/Google login fails
const LOGIN_ERRORS = {
    strava: 'Strava login failed or was cancelled.',
    strava_scope: 'Please allow access to your activities on Strava to log in.',
    google: 'Google login failed or was cancelled.',
    google_email: 'Your Google account email is not verified.',
};

export default function LoginPage() {
    const [searchParams] = useSearchParams();
    const rememberedEmail = getRememberedEmail();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(!!rememberedEmail);
    const [error, setError] = useState(() => LOGIN_ERRORS[searchParams.get('error')] || '');
    const [submitting, setSubmitting] = useState(false);
    
    
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(email, password, remember);
            setRememberedEmail(remember ? email : '');
            navigate('/');
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    }

    // Full-page navigation to the backend, which redirects on to Google / Strava
    function handleGoogleLogin() {
        window.location.href = api.googleLoginUrl(remember);
    }

    function handleStravaLogin() {
        window.location.href = api.stravaLoginUrl();
    }

    return (
        <div className="page-centered fitness-page-bg">
            <form onSubmit={handleSubmit} className="card auth-card">
                <h1 className="page-title">Login</h1>
                {error && <p className="form-error">{error}</p>}
                <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    required
                />

                <div className="auth-row">
                    <label className="form-checkbox">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                        />
                        Remember me
                    </label>
                    <Link to="/forgot-password" className="auth-link">
                        Forgot password?
                    </Link>
                </div>

                <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Logging in…' : 'Login'}
                </button>

                <div className="auth-divider">or</div>

                {/* type="button" so these don't submit the email/password form */}
                <button type="button" className="btn-google btn-block" onClick={handleGoogleLogin}>
                    Continue with Google
                </button>
                <button type="button" className="btn-strava btn-block" onClick={handleStravaLogin}>
                    Login with Strava
                </button>

                <p className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/register" className="auth-link">Register here</Link>
                </p>
            </form>
        </div>
    );
}
