import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import TopNav from '../components/TopNav';
import UserAvatar from '../components/UserAvatar';

const getDisplayName = (user, fallback = 'Unknown') => {
  if (!user) return fallback;
  const composed = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim();
  return composed || user.name || fallback;
};

const toLocalDateTime = (value) => {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Invalid date';
  return parsed.toLocaleString();
};

const buildDurationLabel = (start, end) => {
  if (!start || !end) return 'Not available';

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    return 'Not available';
  }

  const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

function DebateDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinLoading, setJoinLoading] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

  const loadDebateDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/api/debate/${id}`);
      setDebate(data);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to fetch debate details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebateDetails();
  }, [id]);

  const proUser = debate?.participants?.proUser || debate?.proUser || null;
  const conUser = debate?.participants?.conUser || debate?.conUser || null;

  const isLoggedInUser = Boolean(currentUser?.id);
  const isProUser = Boolean(proUser?._id && proUser._id === currentUser.id);
  const isConUser = Boolean(conUser?._id && conUser._id === currentUser.id);

  const canJoinPro = isLoggedInUser && !proUser?._id && !isConUser;
  const canJoinCon = isLoggedInUser && !conUser?._id && !isProUser;

  const handleJoinSide = async (side) => {
    try {
      setJoinLoading(side);
      setActionMessage('');
      setError('');

      await api.post(`/api/debates/${id}/join`, { role: side });
      setActionMessage(`Joined as ${side.toUpperCase()} successfully.`);
      await loadDebateDetails();
    } catch (apiError) {
      setError(apiError.response?.data?.message || `Failed to join as ${side.toUpperCase()}`);
    } finally {
      setJoinLoading('');
    }
  };

  const enterDebateRoom = () => {
    navigate(`/debates/${id}`);
  };

  return (
    <div className="dashboard-page debate-details-page">
      <TopNav />

      <div className="debate-details-shell">
        <div className="debate-details-card panel">
          <div className="panel-content">
            {loading && <p className="subtle">Loading debate details...</p>}
            {error && <p className="error-text">{error}</p>}
            {actionMessage && <p className="success-text">{actionMessage}</p>}

            {!loading && !error && debate && (
              <>
                <div className="debate-details-header">
                  <h1>{debate.title || 'Untitled Debate'}</h1>
                  <span className={`recent-status recent-status-${debate.status || 'upcoming'}`}>
                    {(debate.status || 'upcoming').toUpperCase()}
                  </span>
                </div>

                <section className="debate-details-section">
                  <h2>Basic Info</h2>
                  <div className="debate-details-grid">
                    <p><strong>📝 Title:</strong> {debate.title || 'Not provided'}</p>
                    <p><strong>💡 Topic:</strong> {debate.topic || 'Not provided'}</p>
                    <p><strong>🧩 Category:</strong> {debate.category || 'General'}</p>
                    <p className="debate-details-created-by">
                      <strong>👤 Created By:</strong>
                      <span>
                        <UserAvatar
                          src={debate.createdBy?.profileImage || debate.createdBy?.avatarUrl}
                          name={getDisplayName(debate.createdBy, 'Moderator')}
                          size="xs"
                          className="inline-avatar"
                        />
                        {getDisplayName(debate.createdBy, 'Moderator')}
                      </span>
                    </p>
                  </div>
                  <p className="debate-description-line">
                    <strong>📄 Description:</strong> {debate.description || 'No description provided.'}
                  </p>
                </section>

                <section className="debate-details-section">
                  <h2>Schedule</h2>
                  <div className="debate-details-grid">
                    <p><strong>⏰ Start Time:</strong> {toLocalDateTime(debate.startTime || debate.scheduledTime)}</p>
                    <p><strong>⏳ End Time:</strong> {toLocalDateTime(debate.endTime)}</p>
                    <p><strong>⏱ Duration:</strong> {buildDurationLabel(debate.startTime || debate.scheduledTime, debate.endTime)}</p>
                  </div>
                </section>

                <section className="debate-details-section">
                  <h2>Participants</h2>
                  <div className="debate-participants-grid">
                    <div className="debate-participant-card pro">
                      <h3>Pro User</h3>
                      <p>{proUser ? getDisplayName(proUser, 'Not joined yet') : 'Not joined yet'}</p>
                      {!proUser && <span>Anyone can join this side</span>}
                    </div>

                    <div className="debate-participant-card con">
                      <h3>Con User</h3>
                      <p>{conUser ? getDisplayName(conUser, 'Not joined yet') : 'Not joined yet'}</p>
                      {!conUser && <span>Anyone can join this side</span>}
                    </div>
                  </div>
                </section>

                <section className="debate-details-actions">
                  {canJoinPro && (
                    <button
                      type="button"
                      className="btn-white-outline"
                      onClick={() => handleJoinSide('pro')}
                      disabled={joinLoading === 'pro'}
                    >
                      {joinLoading === 'pro' ? 'Joining Pro...' : 'Join as Pro'}
                    </button>
                  )}

                  {canJoinCon && (
                    <button
                      type="button"
                      className="btn-white-outline"
                      onClick={() => handleJoinSide('con')}
                      disabled={joinLoading === 'con'}
                    >
                      {joinLoading === 'con' ? 'Joining Con...' : 'Join as Con'}
                    </button>
                  )}

                  <button type="button" className="btn-blue-fill" onClick={enterDebateRoom}>
                    Enter Debate Room
                  </button>
                  <Link to="/debate-rooms" className="btn-link info">
                    Back to Debate Rooms
                  </Link>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DebateDetails;
