import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import UserAvatar from './UserAvatar';

function TopNav() {
  const [latestDebates, setLatestDebates] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [dropdownError, setDropdownError] = useState('');
  const [hasUnread, setHasUnread] = useState(localStorage.getItem('hasUnreadNotifications') === '1');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    const onDebateCreated = (payload) => {
      const previous = JSON.parse(localStorage.getItem('liveNotificationDebates') || '[]');
      const next = [payload, ...previous.filter((item) => item.id !== payload.id)].slice(0, 20);
      localStorage.setItem('liveNotificationDebates', JSON.stringify(next));
      localStorage.setItem('hasUnreadNotifications', '1');
      setHasUnread(true);
      setLatestDebates((prev) => {
        const merged = [{ _id: payload.id, title: payload.title }, ...prev.filter((item) => item._id !== payload.id)];
        return merged.slice(0, 10);
      });
    };

    socket.on('debateCreated', onDebateCreated);

    return () => {
      socket.off('debateCreated', onDebateCreated);
    };
  }, []);

  const fetchLatestDebates = async () => {
    try {
      setLoadingLatest(true);
      setDropdownError('');
      const { data } = await api.get('/api/debates/latest');
      setLatestDebates(data || []);
    } catch (error) {
      setDropdownError(error.response?.data?.message || 'Failed to fetch latest debates');
    } finally {
      setLoadingLatest(false);
    }
  };

  const handleBellClick = async () => {
    const nextState = !showDropdown;
    setShowDropdown(nextState);

    if (nextState) {
      localStorage.setItem('hasUnreadNotifications', '0');
      setHasUnread(false);
      await fetchLatestDebates();
    }
  };

  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        <div className="nav-left brand">
          <div className="brand-logo">🛡️</div>
          <span>Academic Debate</span>
        </div>

        <div className="nav-center nav-links">
          <NavLink to="/home" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/debate-rooms" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Debate Rooms
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Leaderboard
          </NavLink>
        </div>

        <div className="nav-right nav-user">
          <div className="notification-wrap">
            <button className="icon-btn" type="button" onClick={handleBellClick} title="Notifications">
              🔔
              {hasUnread && <span className="notification-dot" />}
            </button>
            {showDropdown && (
              <div className="notification-dropdown">
                <div className="dropdown-title">Latest Debates</div>
                {loadingLatest && <p className="subtle">Loading latest debates...</p>}
                {dropdownError && <p className="error-text">{dropdownError}</p>}
                {!loadingLatest && !dropdownError && latestDebates.length === 0 && (
                  <p className="subtle">No latest debates</p>
                )}
                {!loadingLatest && !dropdownError && latestDebates.map((debate) => (
                  <Link
                    key={debate._id}
                    to={`/debates/${debate._id}`}
                    className="latest-item"
                    onClick={() => setShowDropdown(false)}
                  >
                    <span>{debate.title}</span>
                    <span className="new-badge">NEW</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/profile" className="user-link">
            <UserAvatar src={user.profileImage || user.avatarUrl} name={user.name || 'User'} size="sm" className="user-avatar" />
            <span className="user-name-text">{user.name || 'User'}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default TopNav;
