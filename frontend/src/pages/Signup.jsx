import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ROLE_OPTIONS = [
  { label: '👨‍🎓 Student', value: 'student' },
  { label: '🧑‍⚖️ Moderator', value: 'moderator' },
  { label: '✨ Others', value: 'professional' }
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
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

    if (!form.role) {
      setError('Please select a role');
      return;
    }

    if (!EMAIL_PATTERN.test(form.email)) {
      setError('Invalid email');
      return;
    }

    if (String(form.password).length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('Account created. Redirecting...');
      navigate('/home');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-modern-page">
      <div className="auth-modern-card">
        <div className="auth-modern-top">
          <div className="auth-logo-badge" aria-hidden="true">✨</div>
          <h2>Create Account</h2>
          <p>Sign up to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid auth-modern-form">
          <div className="auth-field-group">
            <label htmlFor="name" className="auth-field-label">Full Name</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">👤</span>
              <input
                id="name"
                name="name"
                placeholder="Your full name"
                value={form.name}
                onChange={updateField}
                required
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-field-label" htmlFor="role-student">Role</label>
            <div className="auth-role-toggle" role="radiogroup" aria-label="Select role">
              {ROLE_OPTIONS.map((option) => (
                <button
                  id={`role-${option.value}`}
                  key={option.value}
                  type="button"
                  className={`auth-role-btn ${form.role === option.value ? 'active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, role: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

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
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={updateField}
                type="password"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-signin-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <p className="auth-modern-bottom">
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
