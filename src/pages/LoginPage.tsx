import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { PasswordField } from '../components/PasswordField';

export function LoginPage() {
  const { email, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (email) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const userEmail = String(form.get('email'));
    try {
      await login(userEmail, String(form.get('password')));
      navigate('/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      setError(message);
      if (message.toLowerCase().includes('not verified')) {
        navigate(`/verify-otp?email=${encodeURIComponent(userEmail)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="panel auth-card stack" onSubmit={onSubmit}>
        <div>
          <div className="brand">Multi-Rate</div>
          <p className="muted">Sign in to manage pricing documents.</p>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <label htmlFor="login-email">
          Email
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
          />
        </label>
        <PasswordField
          id="login-password"
          autoComplete="current-password"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted">
          No account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </div>
  );
}
