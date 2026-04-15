import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function DebateList() {
  const [debates, setDebates] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', topic: '', rounds: 3 });
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadDebates = async () => {
    try {
      setError('');
      const { data } = await api.get('/debates');
      setDebates(data);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to load debates');
    }
  };

  useEffect(() => {
    loadDebates();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();

    try {
      await api.post('/debates', {
        title: form.title,
        topic: form.topic,
        rounds: Number(form.rounds)
      });
      setForm({ title: '', topic: '', rounds: 3 });
      await loadDebates();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to create debate');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Available Debates</h2>
        <button onClick={logout} className="secondary">
          Logout
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}

      {user.role === 'moderator' && (
        <form onSubmit={handleCreate} className="form-grid" style={{ marginBottom: 16 }}>
          <input
            placeholder="Debate title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <input
            placeholder="Topic"
            value={form.topic}
            onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
            required
          />
          <input
            type="number"
            min="1"
            value={form.rounds}
            onChange={(event) => setForm((prev) => ({ ...prev, rounds: event.target.value }))}
          />
          <button type="submit">Create Debate</button>
        </form>
      )}

      <ul className="list">
        {debates.map((debate) => (
          <li key={debate._id} className="list-item">
            <strong>{debate.title}</strong> — {debate.topic} ({debate.status})
            {' | '}
            <Link to={`/debates/${debate._id}`}>Join Room</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DebateList;
