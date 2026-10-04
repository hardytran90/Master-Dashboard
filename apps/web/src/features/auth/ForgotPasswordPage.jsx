import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setMessage('');
        setSubmitting(true);
        try {
            const res = await api.forgotPassword(email);
            setMessage(res.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="page-centered fitness-page-bg">
            <form onSubmit={handleSubmit} className="card auth-card">
                <h1 className="page-title">Forgot password</h1>
                <p className="form-hint">
                    Enter the email you log in with. We'll send a new password to that address.
                </p>

                {error && <p className="form-error">{error}</p>}
                {message && <p className="form-success">{message}</p>}

                <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                />

                <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Sending…' : 'Send new password'}
                </button>

                <p className="auth-footer">
                    <Link to="/login" className="auth-link">Back to login</Link>
                </p>
            </form>
        </div>
    );
}
