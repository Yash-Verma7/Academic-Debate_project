import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import api from '../services/api';
import socket from '../services/socket';
import UserAvatar from './UserAvatar';

const normalizeNotification = (item) => ({
  debateId: item?._id || item?.id || '',
  title: item?.title || 'New debate update',
  createdAt: item?.createdAt || new Date().toISOString()
});

const timeAgo = (value) => {
  const timestamp = new Date(value || Date.now()).getTime();
  if (Number.isNaN(timestamp)) return 'Just now';

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
};

function TopNav() {
  const dropdownRef = useRef(null);
  const storedNotifications = useMemo(() => JSON.parse(localStorage.getItem('liveNotificationDebates') || '[]'), []);

  const [latestDebates, setLatestDebates] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [dropdownError, setDropdownError] = useState('');
  const [hasUnread, setHasUnread] = useState(localStorage.getItem('hasUnreadNotifications') === '1');
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(
    localStorage.getItem('hasUnreadNotifications') === '1' ? Math.min(storedNotifications.length, 9) : 0
  );

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setLatestDebates((storedNotifications || []).map(normalizeNotification));
  }, [storedNotifications]);

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
      setUnreadCount(Math.min(next.length, 9));
      setLatestDebates((prev) => {
        const merged = [normalizeNotification(payload), ...prev.filter((item) => item.debateId !== payload.id)];
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
      setLatestDebates((data || []).map(normalizeNotification));
    } catch (error) {
      setDropdownError(error.response?.data?.message || 'Failed to fetch latest debates');
    } finally {
      setLoadingLatest(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    const closeMobileMenuOnResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', closeMobileMenuOnResize);

    return () => {
      window.removeEventListener('resize', closeMobileMenuOnResize);
    };
  }, []);

  const markAllNotifications = () => {
    localStorage.setItem('hasUnreadNotifications', '0');
    setHasUnread(false);
    setUnreadCount(0);
  };

  const handleBellClick = async () => {
    const nextState = !showDropdown;
    setShowDropdown(nextState);

    if (nextState) {
      markAllNotifications();
      await fetchLatestDebates();
    }
  };

  return (
    <nav className="top-nav">
      <div className="top-nav-inner">
        <Link to="/home" className="nav-left brand" onClick={() => setMenuOpen(false)}>
          <div className="brand-logo">🛡️</div>
          <span>Academic Debate</span>
        </Link>

        <button
          type="button"
          className="nav-mobile-toggle"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`nav-center nav-links ${menuOpen ? 'mobile-open' : ''}`}>
          <NavLink to="/home" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/debate-rooms" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            Debate Rooms
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
            Leaderboard
          </NavLink>
        </div>

        <div className="nav-right nav-user">
          <div className="notification-wrap" ref={dropdownRef}>
            <button
              className="icon-btn notif-bell-btn"
              type="button"
              onClick={handleBellClick}
              title="Notifications"
              aria-label="Open notifications"
            >
              <Bell className="notif-bell-icon" strokeWidth={2.4} />
              {hasUnread && <span className="notification-dot">{unreadCount > 0 ? unreadCount : ''}</span>}
            </button>

            {showDropdown && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <span>Notifications</span>
                  <button type="button" className="notification-mark-btn" onClick={markAllNotifications}>
                    Mark all
                  </button>
                </div>

                <div className="notification-scroll-list">
                  {loadingLatest && <p className="subtle">Loading notifications...</p>}
                  {dropdownError && <p className="error-text">{dropdownError}</p>}
                  {!loadingLatest && !dropdownError && latestDebates.length === 0 && (
                    <p className="subtle">No notifications yet</p>
                  )}
                  {!loadingLatest && !dropdownError && latestDebates.map((debate) => (
                    <Link
                      key={debate.debateId}
                      to={`/debate/${debate.debateId}`}
                      className="notification-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <p>New debate: <strong>{debate.title}</strong></p>
                      <span>{timeAgo(debate.createdAt)}</span>
                    </Link>
                  ))}
                </div>
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
