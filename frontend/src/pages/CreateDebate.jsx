import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import api from '../services/api';
import UserAvatar from '../components/UserAvatar';

const categories = ['Technology', 'Science', 'Politics', 'Education', 'Environment' , 'Others'];

const composeDisplayName = (user) => {
  if (!user) return 'User';
  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim();
  return parts || user.name || 'User';
};

const renderHighlightedText = (value, query) => {
  const source = value || '';
  const needle = (query || '').trim();
  if (!needle) return source;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'ig');
  const segments = source.split(regex);

  return segments.map((segment, index) =>
    segment.toLowerCase() === needle.toLowerCase()
      ? <mark key={`${segment}-${index}`} className="search-highlight-mark">{segment}</mark>
      : <span key={`${segment}-${index}`}>{segment}</span>
  );
};

function CreateDebate() {
  const [form, setForm] = useState({
    title: '',
    topic: '',
    description: '',
    category: 'Technology',
    scheduledTime: '',
    endTime: ''
  });
  const [proQuery, setProQuery] = useState('');
  const [conQuery, setConQuery] = useState('');
  const [proResults, setProResults] = useState([]);
  const [conResults, setConResults] = useState([]);
  const [selectedProUser, setSelectedProUser] = useState(null);
  const [selectedConUser, setSelectedConUser] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isModerator = user?.role === 'moderator';

  useEffect(() => {
    if (!isModerator) {
      setError('Only moderators can create debates');
    }
  }, [isModerator]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      const activeQuery = activeDropdown === 'pro' ? proQuery.trim() : conQuery.trim();
      if (!activeQuery) {
        if (activeDropdown === 'pro') setProResults([]);
        if (activeDropdown === 'con') setConResults([]);
        return;
      }

      try {
        setSearchingUsers(true);
        const { data } = await api.get('/api/users/search', {
          params: { q: activeQuery },
          signal: controller.signal
        });

        const filtered = (data || []).filter((user) => {
          if (activeDropdown === 'pro') {
            return !selectedConUser || user._id !== selectedConUser._id;
          }
          return !selectedProUser || user._id !== selectedProUser._id;
        });

        if (activeDropdown === 'pro') setProResults(filtered);
        if (activeDropdown === 'con') setConResults(filtered);
      } catch (_error) {
        if (activeDropdown === 'pro') setProResults([]);
        if (activeDropdown === 'con') setConResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeDropdown, proQuery, conQuery, selectedProUser, selectedConUser]);

  const clearSelection = (side) => {
    if (side === 'pro') {
      setSelectedProUser(null);
      setProQuery('');
      setProResults([]);
      setActiveDropdown('pro');
      return;
    }
    setSelectedConUser(null);
    setConQuery('');
    setConResults([]);
    setActiveDropdown('con');
  };

  const selectUser = (side, user) => {
    if (side === 'pro') {
      if (selectedConUser?._id === user._id) {
        setError('Con participant is already selected as this user');
        return;
      }
      setSelectedProUser(user);
      setProQuery('');
      setProResults([]);
      setActiveDropdown('');
      setError('');
      return;
    }

    if (selectedProUser?._id === user._id) {
      setError('Pro participant is already selected as this user');
      return;
    }

    setSelectedConUser(user);
    setConQuery('');
    setConResults([]);
    setActiveDropdown('');
    setError('');
  };

  const renderParticipantSelector = ({
    side,
    label,
    query,
    setQuery,
    selectedUser,
    results
  }) => (
    <div className="participant-select-wrap">
      <label>{label}</label>

      {selectedUser ? (
        <div className="selected-user-card">
          <span className="participant-inline-user">
            <UserAvatar
              src={selectedUser.profileImage || selectedUser.avatarUrl}
              name={composeDisplayName(selectedUser)}
              size="xs"
            />
            <span>
              <strong>{composeDisplayName(selectedUser)}</strong>
            </span>
          </span>
          <button type="button" className="ghost" onClick={() => clearSelection(side)}>
            Clear
          </button>
        </div>
      ) : (
        <>
          <input
            placeholder={`Search ${label.toLowerCase()} by name...`}
            value={query}
            onFocus={() => setActiveDropdown(side)}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveDropdown(side);
            }}
          />

          {activeDropdown === side && query.trim() && (
            <div className="participant-search-dropdown">
              {searchingUsers && <p className="subtle">Searching users...</p>}
              {!searchingUsers && results.length === 0 && <p className="subtle">No users found</p>}
              {!searchingUsers && results.map((candidate) => (
                <button
                  key={candidate._id}
                  type="button"
                  className="participant-search-option"
                  onClick={() => selectUser(side, candidate)}
                >
                  <UserAvatar
                    src={candidate.profileImage || candidate.avatarUrl}
                    name={composeDisplayName(candidate)}
                    size="xs"
                  />
                  <span>
                    <strong>{renderHighlightedText(composeDisplayName(candidate), query)}</strong>
                    {candidate.email ? <small>{candidate.email}</small> : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (!isModerator) {
        setError('Only moderators can create debates');
        return;
      }

      setSubmitting(true);
      setError('');

      if (selectedProUser?._id && selectedConUser?._id && selectedProUser._id === selectedConUser._id) {
        setError('Pro and Con participants must be different users');
        setSubmitting(false);
        return;
      }

      const { data } = await api.post('/api/debates', {
        title: form.title,
        topic: form.topic,
        description: form.description,
        category: form.category,
        startTime: form.scheduledTime,
        scheduledTime: form.scheduledTime,
        endTime: form.endTime,
        proUserId: selectedProUser?._id || null,
        conUserId: selectedConUser?._id || null
      });
      navigate(`/debates/${data._id}`);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to create debate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page">
      <TopNav />
      <div className="panel">
        <div className="panel-content">
          <div className="toolbar">
            <div>
              <h1 className="page-title">Create Debate</h1>
              <p className="page-subtitle">Set up a new debate room for live participation</p>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          {!isModerator && (
            <div className="details-block" style={{ marginTop: 12 }}>
              <p className="subtle" style={{ margin: 0 }}>
                You do not have permission to create debates. Please switch your role to Moderator in profile settings.
              </p>
            </div>
          )}

          <form className="form-grid" onSubmit={handleSubmit}>
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
            <textarea
              placeholder="Description"
              rows={4}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem' }}>Start Time</label>
              <input
                type="datetime-local"
                value={form.scheduledTime}
                onChange={(event) => setForm((prev) => ({ ...prev, scheduledTime: event.target.value }))}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem' }}>End Time</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                required
              />
            </div>
            {renderParticipantSelector({
              side: 'pro',
              label: 'Pro participant (optional)',
              query: proQuery,
              setQuery: setProQuery,
              selectedUser: selectedProUser,
              results: proResults
            })}

            {renderParticipantSelector({
              side: 'con',
              label: 'Con participant (optional)',
              query: conQuery,
              setQuery: setConQuery,
              selectedUser: selectedConUser,
              results: conResults
            })}

            <div className="button-group">
              <button type="submit" className="success" disabled={submitting || !isModerator}>
                {submitting ? 'Creating...' : 'Create Debate'}
              </button>
              <button type="button" className="ghost" onClick={() => navigate('/debate-rooms')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateDebate;
