import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/login', {
        email: form.email,
        password: form.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('Login successful. Redirecting...');
      navigate('/home');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-modern-page">
      <div className="auth-modern-card">
        <div className="auth-modern-top">
          <div className="auth-logo-badge" aria-hidden="true">🔐</div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue to debate dashboard</p>
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
                value={form.email}
                onChange={updateField}
                type="email"
                required
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label htmlFor="password" className="auth-field-label">Password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">🔒</span>
              <input
                id="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={updateField}
                type="password"
                required
              />
            </div>

            <div className="auth-inline-action">
              <Link to="/forgot-password" className="auth-text-link">Forgot Password?</Link>
            </div>
          </div>

          <button type="submit" className="auth-signin-btn" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <p className="auth-modern-bottom">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="auth-switch-link">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
