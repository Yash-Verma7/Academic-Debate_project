import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister
        ? form
        : {
            email: form.email,
            password: form.password
          };

      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/debates');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="card">
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        {isRegister && (
          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={updateField}
            required
          />
        )}
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={updateField}
          type="email"
          required
        />
        <input
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={updateField}
          type="password"
          required
        />
        {isRegister && (
          <select name="role" value={form.role} onChange={updateField}>
            <option value="student">Student</option>
            <option value="moderator">Moderator</option>
          </select>
        )}
        <button type="submit">
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <button type="button" className="secondary" onClick={() => setIsRegister((prev) => !prev)}>
        {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
      </button>
    </div>
  );
}

export default Login;
