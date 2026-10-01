import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { api } from '../../lib/api';

// Error codes the backend appends as ?error=... when Strava login fails
const STRAVA_ERRORS = {
    strava: 'Strava login failed or was cancelled.',
    strava_scope: 'Please allow access to your activities on Strava to log in.',
};

export default function LoginPage() {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(() => STRAVA_ERRORS[searchParams.get('error')] || '');
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    }

    // Full-page navigation to the backend, which redirects on to Strava's authorization page
    function handleStravaLogin() {
        window.location.href = api.stravaLoginUrl();
    }

    return (
        <div className="page-centered">
            <form onSubmit={handleSubmit} className="card w-80 space-y-4">
                <h1 className="page-title">Login</h1>
                {error && <p className="form-error">{error}</p>}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    required
                />
                <button type="submit" className="btn-primary btn-block">
                    Login
                </button>

                <div className="auth-divider">or</div>

                {/* type="button" so clicking it doesn't submit the email/password form */}
                <button type="button" className="btn-strava btn-block" onClick={handleStravaLogin}>
                    Login with Strava
                </button>
            </form>
        </div>
    );
}
