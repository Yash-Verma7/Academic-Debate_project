import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import api from '../services/api';
import UserAvatar from '../components/UserAvatar';

const categories = ['Technology', 'Science', 'Politics', 'Education', 'Environment', 'Others'];

const composeDisplayName = (user) => {
  if (!user) return 'User';
  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim();
  return parts || user.name || 'User';
};

const localDateTimeToUtcIso = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
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
  const [successToast, setSuccessToast] = useState('');
  const [touched, setTouched] = useState({
    title: false,
    topic: false,
    scheduledTime: false,
    endTime: false
  });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isModerator = user?.role === 'moderator';

  const startDate = form.scheduledTime ? new Date(form.scheduledTime) : null;
  const endDate = form.endTime ? new Date(form.endTime) : null;
  const hasValidStartDate = Boolean(startDate && !Number.isNaN(startDate.getTime()));
  const hasValidEndDate = Boolean(endDate && !Number.isNaN(endDate.getTime()));
  const durationMs = hasValidStartDate && hasValidEndDate ? endDate.getTime() - startDate.getTime() : 0;
  const hasValidDuration = durationMs > 0;

  const inlineErrors = {
    title: !form.title.trim() ? 'Title is required' : '',
    topic: !form.topic.trim() ? 'Topic is required' : '',
    scheduledTime: !form.scheduledTime
      ? 'Start time is required'
      : (!hasValidStartDate ? 'Invalid start time' : ''),
    endTime: !form.endTime
      ? 'End time is required'
      : (!hasValidEndDate ? 'Invalid end time' : (!hasValidDuration ? 'End time must be after start time' : ''))
  };

  const isFormValid =
    isModerator &&
    !inlineErrors.title &&
    !inlineErrors.topic &&
    !inlineErrors.scheduledTime &&
    !inlineErrors.endTime;

  const formatDuration = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return 'Set valid start and end time';
    const totalMinutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    return `${minutes}m`;
  };

  const buildFieldClass = (fieldName) => {
    const hasError = touched[fieldName] && inlineErrors[fieldName];
    return `premium-input ${hasError ? 'has-error' : ''}`;
  };

  const markTouched = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

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

  useEffect(() => {
    if (!successToast) return undefined;
    const timer = setTimeout(() => setSuccessToast(''), 1800);
    return () => clearTimeout(timer);
  }, [successToast]);

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

      <input
        className="premium-input"
        placeholder={selectedUser ? `${composeDisplayName(selectedUser)} assigned` : `Search ${label.toLowerCase()} by name...`}
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
      setTouched({
        title: true,
        topic: true,
        scheduledTime: true,
        endTime: true
      });

      if (!isFormValid) {
        setError('Please fix the highlighted fields before creating the debate');
        setSubmitting(false);
        return;
      }

      if (selectedProUser?._id && selectedConUser?._id && selectedProUser._id === selectedConUser._id) {
        setError('Pro and Con participants must be different users');
        setSubmitting(false);
        return;
      }

      const startTimeUtc = localDateTimeToUtcIso(form.scheduledTime);
      const endTimeUtc = localDateTimeToUtcIso(form.endTime);

      if (!startTimeUtc || !endTimeUtc) {
        setError('Please provide valid start and end times');
        setSubmitting(false);
        return;
      }

      const { data } = await api.post('/api/debates', {
        title: form.title,
        topic: form.topic,
        description: form.description,
        category: form.category,
        startTime: startTimeUtc,
        scheduledTime: startTimeUtc,
        endTime: endTimeUtc,
        proUserId: selectedProUser?._id || null,
        conUserId: selectedConUser?._id || null
      });
      setSuccessToast('Debate created successfully! Redirecting...');
      setTimeout(() => {
        navigate(`/debates/${data._id}`);
      }, 700);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to create debate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page create-debate-page-premium">
      <TopNav />
      <div className="create-debate-bg-glow" />

      <div className="create-debate-shell">
        <div className="create-debate-card">
          <header className="create-debate-header">
            <div className="create-debate-header-icon" aria-hidden="true">⚖️</div>
            <div>
              <h1>Create New Debate</h1>
              <p>Set up a live debate room for participants</p>
            </div>
          </header>

          {error && <p className="error-text">{error}</p>}
          {successToast && <p className="success-text create-success-toast">{successToast}</p>}

          {!isModerator && (
            <div className="details-block create-warning-block">
              <p className="subtle">
                You do not have permission to create debates. Please switch your role to Moderator in profile settings.
              </p>
            </div>
          )}

          <form className="create-form-layout" onSubmit={handleSubmit}>
            <section className="create-section-block">
              <div className="create-section-title-row">
                <h2>Basic Info</h2>
              </div>

              <div className="create-input-grid">
                <div className="premium-field-wrap">
                  <label htmlFor="debate-title">📝 Title</label>
                  <input
                    id="debate-title"
                    className={buildFieldClass('title')}
                    placeholder="Enter debate title"
                    value={form.title}
                    onBlur={() => markTouched('title')}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />
                  {touched.title && inlineErrors.title && <small className="field-error-text">{inlineErrors.title}</small>}
                </div>

                <div className="premium-field-wrap">
                  <label htmlFor="debate-topic">💡 Topic</label>
                  <input
                    id="debate-topic"
                    className={buildFieldClass('topic')}
                    placeholder="Debate topic"
                    value={form.topic}
                    onBlur={() => markTouched('topic')}
                    onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
                    required
                  />
                  {touched.topic && inlineErrors.topic && <small className="field-error-text">{inlineErrors.topic}</small>}
                </div>

                <div className="premium-field-wrap premium-span-full">
                  <label htmlFor="debate-description">📄 Description</label>
                  <textarea
                    id="debate-description"
                    className="premium-input premium-textarea"
                    placeholder="Add context, agenda, and expectations"
                    rows={4}
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>

                <div className="premium-field-wrap">
                  <label htmlFor="debate-category">🧩 Category</label>
                  <select
                    id="debate-category"
                    className="premium-input"
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="create-section-block">
              <div className="create-section-title-row">
                <h2>Schedule</h2>
              </div>

              <div className="create-schedule-grid">
                <div className="premium-field-wrap">
                  <label htmlFor="debate-start-time">⏰ Start Time</label>
                  <input
                    id="debate-start-time"
                    className={buildFieldClass('scheduledTime')}
                    type="datetime-local"
                    value={form.scheduledTime}
                    onBlur={() => markTouched('scheduledTime')}
                    onChange={(event) => setForm((prev) => ({ ...prev, scheduledTime: event.target.value }))}
                    required
                  />
                  {touched.scheduledTime && inlineErrors.scheduledTime && (
                    <small className="field-error-text">{inlineErrors.scheduledTime}</small>
                  )}
                </div>

                <div className="premium-field-wrap">
                  <label htmlFor="debate-end-time">⏳ End Time</label>
                  <input
                    id="debate-end-time"
                    className={buildFieldClass('endTime')}
                    type="datetime-local"
                    value={form.endTime}
                    onBlur={() => markTouched('endTime')}
                    onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                    required
                  />
                  {touched.endTime && inlineErrors.endTime && <small className="field-error-text">{inlineErrors.endTime}</small>}
                </div>
              </div>

              <div className="duration-preview-card">
                <span>Debate Duration</span>
                <strong>{formatDuration(durationMs)}</strong>
              </div>
            </section>

            <section className="create-section-block">
              <div className="create-section-title-row">
                <h2>Participants</h2>
              </div>

              <div className="participants-premium-grid">
                <div className="participant-side-card pro-theme">
                  <div className="participant-side-head">
                    <div>
                      <small>PRO SIDE</small>
                      <h4>Pro Speaker</h4>
                    </div>
                    <div className="participant-theme-dot pro-dot" />
                  </div>

                  {selectedProUser ? (
                    <div className="selected-user-card participant-selected-card">
                      <span className="participant-inline-user">
                        <UserAvatar
                          src={selectedProUser.profileImage || selectedProUser.avatarUrl}
                          name={composeDisplayName(selectedProUser)}
                          size="xs"
                        />
                        <span>
                          <strong>{composeDisplayName(selectedProUser)}</strong>
                        </span>
                      </span>
                      <button type="button" className="ghost" onClick={() => clearSelection('pro')}>
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="subtle">Anyone can join this side</p>
                  )}

                  {renderParticipantSelector({
                    side: 'pro',
                    label: 'Assign participant (optional)',
                    query: proQuery,
                    setQuery: setProQuery,
                    selectedUser: selectedProUser,
                    results: proResults
                  })}
                </div>

                <div className="participant-side-card con-theme">
                  <div className="participant-side-head">
                    <div>
                      <small>CON SIDE</small>
                      <h4>Con Speaker</h4>
                    </div>
                    <div className="participant-theme-dot con-dot" />
                  </div>

                  {selectedConUser ? (
                    <div className="selected-user-card participant-selected-card">
                      <span className="participant-inline-user">
                        <UserAvatar
                          src={selectedConUser.profileImage || selectedConUser.avatarUrl}
                          name={composeDisplayName(selectedConUser)}
                          size="xs"
                        />
                        <span>
                          <strong>{composeDisplayName(selectedConUser)}</strong>
                        </span>
                      </span>
                      <button type="button" className="ghost" onClick={() => clearSelection('con')}>
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="subtle">Anyone can join this side</p>
                  )}

                  {renderParticipantSelector({
                    side: 'con',
                    label: 'Assign participant (optional)',
                    query: conQuery,
                    setQuery: setConQuery,
                    selectedUser: selectedConUser,
                    results: conResults
                  })}
                </div>
              </div>
            </section>

            <div className="create-actions-row">
              <button type="submit" className="create-primary-btn" disabled={submitting || !isFormValid}>
                {submitting ? 'Creating...' : 'Create Debate'}
              </button>
              <button type="button" className="create-cancel-btn" onClick={() => navigate('/debate-rooms')}>
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
