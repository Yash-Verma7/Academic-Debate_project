import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!EMAIL_PATTERN.test(email)) {
      setError('Invalid email');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSuccess('Reset link sent to your email');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-modern-page">
      <div className="auth-modern-card">
        <div className="auth-modern-top">
          <div className="auth-logo-badge" aria-hidden="true">📩</div>
          <h2>Forgot Password</h2>
          <p>Enter your email to reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid auth-modern-form">
          <div className="auth-field-group">
            <label htmlFor="email" className="auth-field-label">Email</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">✉️</span>
              <input
                id="email"
                name="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-signin-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <p className="auth-modern-bottom">
          Back to{' '}
          <Link to="/login" className="auth-switch-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
