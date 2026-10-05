import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            await register(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    }

    return (
        <div className="page-centered fitness-page-bg">
            <form onSubmit={handleSubmit} className="card auth-card">
                <h1 className="page-title">Create an account</h1>
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
                    placeholder="Password (at least 8 characters)"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    required
                />
                <input
                    type="password"
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="form-input"
                    required
                />

                <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Creating account…' : 'Create account'}
                </button>

                <p className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login" className="auth-link">Log in</Link>
                </p>
            </form>
        </div>
    );
}
