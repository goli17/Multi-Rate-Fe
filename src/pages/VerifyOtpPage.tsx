import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';

export function VerifyOtpPage() {
  const { email: sessionEmail, completeLogin } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const emailFromQuery = params.get('email') ?? '';
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (sessionEmail) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.verifyOtp(email, code);
      completeLogin(res.accessToken, res.user.email);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.resendOtp(email);
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Resend failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="panel auth-card stack" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <div className="brand">Multi-Rate</div>
          <p className="muted">Enter the 6-digit code sent to your email.</p>
        </div>
        {error ? <div className="error">{error}</div> : null}
        {info ? <p className="muted">{info}</p> : null}
        <label htmlFor="otp-email">
          Email
          <input
            id="otp-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label htmlFor="otp-code">
          Verification code
          <input
            id="otp-code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify email'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={loading || !email}
          onClick={() => void onResend()}
        >
          Resend code
        </button>
        <p className="muted">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
