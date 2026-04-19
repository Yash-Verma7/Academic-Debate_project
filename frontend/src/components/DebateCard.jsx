import { Link } from 'react-router-dom';
import UserAvatar from './UserAvatar';

const formatSchedule = (dateValue) => {
  if (!dateValue) return 'Not Scheduled';
  return new Date(dateValue).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatName = (name, fallback) => {
  if (!name) return fallback;
  if (/^(ui|qa)\s*\d+$/i.test(name.trim())) return fallback;
  return name;
};

function DebateCard({ debate, onViewDetails, detailOpen = false, compact = false }) {
  const status = debate.status || 'upcoming';
  const moderatorName = formatName(debate.createdBy?.name, 'Moderator');
  const proName = formatName(
    debate.participants?.proUser?.name || debate.participantLabels?.proLabel,
    'Open Pro Slot'
  );
  const conName = formatName(
    debate.participants?.conUser?.name || debate.participantLabels?.conLabel,
    'Open Con Slot'
  );
  const proImage = debate.participants?.proUser?.profileImage || debate.participants?.proUser?.avatarUrl || '';
  const conImage = debate.participants?.conUser?.profileImage || debate.participants?.conUser?.avatarUrl || '';

  const badgeClass =
    status === 'live' ? 'badge-live' : status === 'completed' ? 'badge-completed' : 'badge-upcoming';

  const hasDetailToggle = typeof onViewDetails === 'function';

  return (
    <article className={`home-debate-card debate-room-home-card ${compact ? 'compact' : ''}`}>
      <div className="home-card-header">
        <div className="home-card-status">
          <span className={badgeClass}>{status.toUpperCase()}</span>
        </div>
        <div className="home-card-watchers">👥 {debate.watchersCount || 0} watching</div>
      </div>

      <h2 className="home-card-title debate-room-title">{debate.title}</h2>
      <p className="home-card-mod debate-room-mod">Moderated by <strong>{moderatorName}</strong></p>
      <p className="subtle debate-room-meta">{debate.category} • {formatSchedule(debate.startTime || debate.scheduledTime)}</p>

      <div className="home-card-versus">
        <div className="home-participant">
          <div className="home-avatar-wrap">
            <UserAvatar src={proImage} name={proName} size="lg" className="home-avatar-media" />
            <div className="home-avatar-badge pro">Pro</div>
          </div>
          <div className="home-participant-name">{proName}</div>
        </div>

        <div className="home-vs-circle">VS</div>

        <div className="home-participant">
          <div className="home-avatar-wrap">
            <UserAvatar src={conImage} name={conName} size="lg" className="home-avatar-media" />
            <div className="home-avatar-badge con">Con</div>
          </div>
          <div className="home-participant-name">{conName}</div>
        </div>
      </div>

      {hasDetailToggle && detailOpen && (
        <div className="details-block">
          <p className="subtle" style={{ margin: 0 }}>
            {debate.description || debate.topic || 'No additional description yet.'}
          </p>
        </div>
      )}

      <div className="home-card-actions debate-room-actions">
        {hasDetailToggle ? (
          <button type="button" className="btn-white-outline" onClick={onViewDetails}>
            {detailOpen ? 'Hide Details' : 'View Details'}
          </button>
        ) : (
          <Link to={`/debates/${debate._id}`} className="btn-white-outline">
            View Details
          </Link>
        )}
        <Link to={`/debates/${debate._id}`} className="btn-blue-fill">
          Join Debate
        </Link>
      </div>
    </article>
  );
}

export default DebateCard;
