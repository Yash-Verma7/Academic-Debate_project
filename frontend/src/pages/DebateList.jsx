import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import TopNav from '../components/TopNav';
import DebateCard from '../components/DebateCard';
import socket from '../services/socket';

const categories = ['All Categories', 'Technology', 'Science', 'Politics', 'Education', 'Environment'];

const areDebatesEquivalent = (previous, next) => {
  if (!Array.isArray(previous) || !Array.isArray(next)) return false;
  if (previous.length !== next.length) return false;

  return previous.every((item, index) => {
    const nextItem = next[index];
    if (!nextItem) return false;

    const previousProId = item?.participants?.proUser?._id || item?.proUser?._id || item?.proUser || null;
    const previousConId = item?.participants?.conUser?._id || item?.conUser?._id || item?.conUser || null;
    const nextProId = nextItem?.participants?.proUser?._id || nextItem?.proUser?._id || nextItem?.proUser || null;
    const nextConId = nextItem?.participants?.conUser?._id || nextItem?.conUser?._id || nextItem?.conUser || null;

    return (
      item?._id === nextItem?._id &&
      item?.status === nextItem?.status &&
      item?.watchersCount === nextItem?.watchersCount &&
      item?.startTime === nextItem?.startTime &&
      item?.scheduledTime === nextItem?.scheduledTime &&
      item?.endTime === nextItem?.endTime &&
      String(previousProId || '') === String(nextProId || '') &&
      String(previousConId || '') === String(nextConId || '')
    );
  });
};

function DebateList() {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [sortBy, setSortBy] = useState('recent');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canCreateDebate = currentUser?.role === 'moderator';

  const loadDebates = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }

      const { data } = await api.get('/api/debates');

      setDebates((prev) => (areDebatesEquivalent(prev, data) ? prev : data));
    } catch (apiError) {
      if (!silent) {
        setError(apiError.response?.data?.message || 'Failed to load debates');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDebates();
  }, []);

  useEffect(() => {
    const queryStatus = searchParams.get('status') || 'all';
    setSelectedStatus(queryStatus);
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    const onDebateCreated = () => {
      loadDebates({ silent: true }).catch(() => {});
    };

    const onDebateUpdated = (payload) => {
      setDebates((prev) =>
        prev.map((item) =>
          item._id === payload.debateId
            ? {
                ...item,
                status: payload.status ?? item.status,
                startTime: payload.startTime ?? item.startTime,
                endTime: payload.endTime ?? item.endTime,
                scheduledTime: payload.scheduledTime ?? item.scheduledTime,
                watchersCount: payload.watchersCount ?? item.watchersCount,
                proVotes: payload.proVotes ?? item.proVotes,
                conVotes: payload.conVotes ?? item.conVotes,
                participants: payload.participants || item.participants
              }
            : item
        )
      );
    };

    const onDebateStatusChanged = (payload) => {
      setDebates((prev) =>
        prev.map((item) =>
          item._id === payload.debateId
            ? {
                ...item,
                status: payload.status ?? item.status
              }
            : item
        )
      );
    };

    socket.on('debateCreated', onDebateCreated);
    socket.on('debateUpdated', onDebateUpdated);
    socket.on('debateStatusChanged', onDebateStatusChanged);

    return () => {
      socket.off('debateCreated', onDebateCreated);
      socket.off('debateUpdated', onDebateUpdated);
      socket.off('debateStatusChanged', onDebateStatusChanged);
    };
  }, []);

  const filteredDebates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = debates.filter((debate) => {
      const matchesSearch =
        !normalizedQuery ||
        debate.title.toLowerCase().includes(normalizedQuery) ||
        (debate.topic || '').toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        selectedCategory === 'All Categories' ||
        debate.category === selectedCategory;

      const matchesStatus = selectedStatus === 'all' || debate.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortBy === 'watchers') {
      return filtered.sort((a, b) => (b.watchersCount || 0) - (a.watchersCount || 0));
    }

    if (sortBy === 'scheduled') {
      return filtered.sort((a, b) => {
        const aTime = a.scheduledTime ? new Date(a.scheduledTime).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.scheduledTime ? new Date(b.scheduledTime).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [debates, searchQuery, selectedCategory, selectedStatus, sortBy]);

  return (
    <div className="dashboard-page debate-rooms-page">
      <TopNav />

      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Debate Rooms</h1>
          <p className="page-subtitle">Browse, filter, and join debate rooms instantly</p>
        </div>
        <div className="button-group">
          <button onClick={loadDebates} className="info" type="button">Refresh</button>
          {canCreateDebate && <Link to="/create-debate" className="btn-link primary">Create Debate</Link>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-content">
          <div className="room-filter-bar">
            <input
              className="search-input"
              placeholder="Search debates..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
              <option value="all">All Status</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recent">Sort: Newest</option>
              <option value="watchers">Sort: Most Watched</option>
              <option value="scheduled">Sort: Scheduled Time</option>
            </select>
          </div>

          {error && <p className="error-text">{error}</p>}
          {loading && <p className="subtle">Loading debates...</p>}
          {!loading && filteredDebates.length === 0 && <p className="subtle">No debates available for selected filters.</p>}

          <div className="debate-card-grid" style={{ marginTop: 12 }}>
            {filteredDebates.map((debate) => (
              <DebateCard key={debate._id} debate={debate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DebateList;
