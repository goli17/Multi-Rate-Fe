import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { PasswordField } from '../components/PasswordField';

export function SignupPage() {
  const { email, signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (email) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await signup(
        String(form.get('email')),
        String(form.get('password')),
      );
      if (res.requiresVerification) {
        navigate(`/verify-otp?email=${encodeURIComponent(res.email)}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="panel auth-card stack" onSubmit={onSubmit}>
        <div>
          <div className="brand">Multi-Rate</div>
          <p className="muted">Create an account to start drafting documents.</p>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <label htmlFor="signup-email">
          Email
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
          />
        </label>
        <PasswordField
          id="signup-password"
          autoComplete="new-password"
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
