import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password mismatch');
      return;
    }

    setLoading(true);

    try {
      await api.post(`/api/auth/reset-password/${token}`, {
        password: form.password,
        confirmPassword: form.confirmPassword
      });

      setSuccess('Password reset successful. Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-modern-page">
      <div className="auth-modern-card">
        <div className="auth-modern-top">
          <div className="auth-logo-badge" aria-hidden="true">🔑</div>
          <h2>Reset Password</h2>
          <p>Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid auth-modern-form">
          <div className="auth-field-group">
            <label htmlFor="password" className="auth-field-label">New Password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">🔒</span>
              <input
                id="password"
                name="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={updateField}
                type="password"
                required
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label htmlFor="confirmPassword" className="auth-field-label">Confirm Password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">🔒</span>
              <input
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={updateField}
                type="password"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-signin-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPassword;
