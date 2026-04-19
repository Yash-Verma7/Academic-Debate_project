import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import TopNav from '../components/TopNav';
import socket from '../services/socket';
import DebateCard from '../components/DebateCard';
import UserAvatar from '../components/UserAvatar';

const composeDisplayName = (user) => {
  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim();
  return parts || user.name || 'User';
};

function Home() {
  const [trendingDebates, setTrendingDebates] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [dashStats, setDashStats] = useState({ activeDebatersCount: 0, liveRoomsCount: 0, upcomingRoomsCount: 0, completedRoomsCount: 0 });

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleDebateCount, setVisibleDebateCount] = useState(5);
  const debateScrollRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canCreateDebate = currentUser?.role === 'moderator';

  const categories = ['Technology', 'Science', 'Politics', 'Education', 'Environment'];

  useEffect(() => {
    const loadRecentlyViewed = () => {
      const saved = JSON.parse(localStorage.getItem('recentlyViewedDebates') || '[]');
      setRecentlyViewed(Array.isArray(saved) ? saved.slice(0, 5) : []);
    };

    loadRecentlyViewed();

    const onStorage = (event) => {
      if (event.key === 'recentlyViewedDebates') {
        loadRecentlyViewed();
      }
    };

    const onWindowFocus = () => {
      loadRecentlyViewed();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, []);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Load feed
        const { data } = await api.get('/api/debates/home-feed');
        setTrendingDebates(data.trendingDebates || []);

        setDashStats({
          activeDebatersCount: data.activeDebatersCount || 0,
          liveRoomsCount: data.liveRoomsCount || 0,
          upcomingRoomsCount: data.upcomingRoomsCount || 0,
          completedRoomsCount: data.completedRoomsCount || 0
        });

        // Load leaderboard
        const leaderData = await api.get('/api/leaderboard', { params: { limit: 5 } });
        setLeaderboard((leaderData.data || []).slice(0, 5));
      } catch (apiError) {
        setError(apiError.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    const refreshOnCreate = async () => {
      const { data } = await api.get('/api/debates/home-feed');
      setTrendingDebates(data.trendingDebates || []);
      setDashStats({
        activeDebatersCount: data.activeDebatersCount || 0,
        liveRoomsCount: data.liveRoomsCount || 0,
        upcomingRoomsCount: data.upcomingRoomsCount || 0,
        completedRoomsCount: data.completedRoomsCount || 0
      });
    };

    const onDebateCreated = () => {
      refreshOnCreate().catch(() => {});
    };

    const onDebateUpdated = (payload) => {
      const updateItem = (item) =>
        item._id === payload.debateId
          ? {
              ...item,
              watchersCount: payload.watchersCount ?? item.watchersCount,
              status: payload.status ?? item.status,
              startTime: payload.startTime ?? item.startTime,
              endTime: payload.endTime ?? item.endTime,
              scheduledTime: payload.scheduledTime ?? item.scheduledTime,
            }
          : item;

      setTrendingDebates((prev) => prev.map(updateItem));
    };

    const onDebateStatusChanged = () => {
      refreshOnCreate().catch(() => {});
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

  // Filter based on search and category
  const filteredDebates = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase();
    const filtered = trendingDebates.filter((debate) => {
      const status = debate.status || 'upcoming';
      const isRoomVisible = status === 'live' || status === 'upcoming';
      if (!isRoomVisible) return false;

      const titleMatch = (debate.title || '').toLowerCase().includes(normalizedSearch);
      const topicMatch = (debate.topic || '').toLowerCase().includes(normalizedSearch);
      const matchSearch = titleMatch || topicMatch;
      const matchCat = activeCategory === 'All' ? true : debate.category === activeCategory;

      return matchSearch && matchCat;
    });

    return filtered.sort((first, second) => {
      const statusPriority = { live: 0, upcoming: 1 };
      const firstPriority = statusPriority[first.status] ?? 2;
      const secondPriority = statusPriority[second.status] ?? 2;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      if (firstPriority === 0) {
        const watcherDiff = (second.watchersCount || 0) - (first.watchersCount || 0);
        if (watcherDiff !== 0) return watcherDiff;
        return new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
      }

      const firstStart = new Date(first.startTime || first.scheduledTime || first.createdAt || 0).getTime();
      const secondStart = new Date(second.startTime || second.scheduledTime || second.createdAt || 0).getTime();
      const startDiff = firstStart - secondStart;
      if (startDiff !== 0) return startDiff;

      return (second.watchersCount || 0) - (first.watchersCount || 0);
    });
  }, [trendingDebates, searchQuery, activeCategory]);

  const visibleDebates = useMemo(
    () => filteredDebates.slice(0, visibleDebateCount),
    [filteredDebates, visibleDebateCount]
  );

  useEffect(() => {
    setVisibleDebateCount(5);
    if (debateScrollRef.current) {
      debateScrollRef.current.scrollTop = 0;
    }
  }, [activeCategory, searchQuery]);

  const handleDebateScroll = (event) => {
    if (visibleDebateCount >= filteredDebates.length) return;

    const container = event.currentTarget;
    const scrolledToBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 40;

    if (scrolledToBottom) {
      setVisibleDebateCount((prev) => Math.min(prev + 5, filteredDebates.length));
    }
  };

  return (
    <div className="layout-app">
      <TopNav />
      
      <div className="layout-main">
        {/* Left Sidebar */}
        <aside className="layout-left">
          <h3 className="section-title">CATEGORIES</h3>
          <ul className="category-list">
            <li className={activeCategory === 'All' ? 'active' : ''} onClick={() => setActiveCategory('All')}>
               <span className="cat-icon">🌐</span> All Categories
            </li>
            {categories.map(cat => (
              <li 
                key={cat} 
                className={activeCategory === cat ? 'active' : ''}
                onClick={() => setActiveCategory(cat)}
              >
                <span className="cat-icon">⚡</span> {cat}
              </li>
            ))}
          </ul>
          
          <div className="verified-box">
             <div className="shield-icon">🛡️</div>
             <h4>Verified Debater</h4>
             <p>Verify your credentials to join high-stakes academic debates.</p>
             <Link to="/profile">Get Verified &rarr;</Link>
          </div>
        </aside>

        {/* Middle Content */}
        <main className="layout-middle">
          <header className="dash-header">
             <h1>Debate Dashboard</h1>
             <p>Explore and join active debates across various academic disciplines.</p>
          </header>
          
          <div className="controls-row">
             <div className="search-wrap">
               <span className="search-icon">🔍</span>
               <input 
                 placeholder="Search debates..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             <div className="category-select">
               <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)}>
                 <option value="All">All Categories</option>
                 {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
               </select>
             </div>
          </div>
          
          <div className="stats-row">
             <Link to="/debate-rooms" className="dashboard-stat-card blue" style={{textDecoration: 'none', cursor: 'pointer'}}>
               <div className="stat-icon">👥</div>
               <div className="stat-info">
                 <span className="stat-val">{dashStats.activeDebatersCount}</span>
                 <span className="stat-label">ACTIVE DEBATERS</span>
               </div>
             </Link>
             <Link to="/debate-rooms?status=live" className="dashboard-stat-card green" style={{textDecoration: 'none', cursor: 'pointer'}}>
               <div className="stat-icon">⏱️</div>
               <div className="stat-info">
                 <span className="stat-val">{dashStats.liveRoomsCount}</span>
                 <span className="stat-label">LIVE ROOMS</span>
               </div>
             </Link>
             <Link to="/debate-rooms?status=upcoming" className="dashboard-stat-card red" style={{textDecoration: 'none', cursor: 'pointer'}}>
               <div className="stat-icon">📅</div>
               <div className="stat-info">
                 <span className="stat-val">{dashStats.upcomingRoomsCount}</span>
                 <span className="stat-label">UPCOMING ROOMS</span>
               </div>
             </Link>
             <Link to="/debate-rooms?status=completed" className="dashboard-stat-card gray" style={{textDecoration: 'none', cursor: 'pointer'}}>
               <div className="stat-icon">✅</div>
               <div className="stat-info">
                 <span className="stat-val">{dashStats.completedRoomsCount}</span>
                 <span className="stat-label">COMPLETED DEBATES</span>
               </div>
             </Link>
          </div>

          <section className="recently-viewed-section">
            <div className="recently-viewed-head">
              <h3 className="section-title line-title"><span>RECENTLY VIEWED DEBATES</span></h3>
              {recentlyViewed.length > 0 && (
                <span className="recent-count">{recentlyViewed.length} recent</span>
              )}
            </div>

            {recentlyViewed.length === 0 ? (
              <p className="subtle">No recently viewed debates yet. Open any debate room to see it here.</p>
            ) : (
              <div className="recently-viewed-track no-scrollbar">
                {recentlyViewed.map((debate) => (
                  <Link key={`recent-${debate._id}`} to={`/debates/${debate._id}`} className="recently-viewed-card">
                    <div className="recently-viewed-meta">
                      <span className={`recent-status recent-status-${debate.status || 'upcoming'}`}>
                        {(debate.status || 'upcoming').toUpperCase()}
                      </span>
                      <span className="recent-watchers">👥 {debate.watchersCount || 0}</span>
                    </div>
                    <h4 className="recent-title">{debate.title || 'Untitled Debate'}</h4>
                    <p className="recent-subtext">{debate.category || 'General'} • {debate.topic || 'No topic'}</p>
                    <p className="recent-subtext recent-user-line">
                      <UserAvatar
                        src={debate.createdBy?.profileImage || debate.createdBy?.avatarUrl}
                        name={debate.createdBy?.name || 'Moderator'}
                        size="xs"
                        className="inline-avatar"
                      />
                      <span>By {debate.createdBy?.name || 'Moderator'}</span>
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <h3 className="section-title line-title"><span>DEBATE ROOMS</span></h3>
          
          {loading && <p className="subtle">Loading debates...</p>}
          {error && <p className="error-text">{error}</p>}
          
          {!loading && filteredDebates.length === 0 && <p className="subtle">No debates found.</p>}

          <div
            ref={debateScrollRef}
            className="home-debate-scroll-container no-scrollbar"
            onScroll={handleDebateScroll}
          >
            <div className="debate-list home-debate-list">
              {visibleDebates.map((debate) => (
                <DebateCard key={debate._id} debate={debate} />
              ))}
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="layout-right">
          <div className="leaderboard-section">
            <div className="leader-section-header">
               <h3>LEADERBOARD</h3>
               <Link to="/leaderboard">View All</Link>
            </div>
            <ul className="leader-list home-leaderboard">
               {leaderboard.length === 0 && <p className="subtle">No Data</p>}
               {leaderboard.map((user, idx) => (
                 <li key={user._id} className="leader-item">
                    <div className="leader-rank">{idx + 1}</div>
                  <UserAvatar src={user.profileImage || user.avatarUrl} name={composeDisplayName(user)} size="md" className="leader-avatar" />
                    <div className="leader-details">
                       <h4 className="leader-name">{composeDisplayName(user)}</h4>
                       <span className="leader-tier">{user.points > 100 ? 'Gold Tier' : 'Silver Tier'}</span>
                    </div>
                    <div className="leader-points">
                       <div className="leader-points-val">{user.points}</div>
                       <div className="leader-points-lbl">pts</div>
                    </div>
                 </li>
               ))}
            </ul>
          </div>
          
          <div className="tournament-card">
              <div className="tourney-badge">🏆 TOURNAMENT</div>
              <h4 className="tourney-title">National Debate Championship</h4>
              <p className="tourney-desc">Registration ends in 3 days. Total prize pool $5,000.</p>
              <button className="tourney-btn">Register Now</button>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="layout-footer">
          <div className="footer-left">
             <strong>🛡️ Academic Debate</strong>
             <span>© 2024 Academic Debate Platform. All rights reserved.</span>
          </div>
          <div className="footer-right">
             <Link to="#">Guidelines</Link>
             <Link to="#">Privacy Policy</Link>
          </div>
      </footer>

      {/* FAB Overlay */}
      {canCreateDebate && (
        <Link to="/create-debate" className="fab-create" title="Create Debate">
          <span>+ Create Debate</span>
        </Link>
      )}
    </div>
  );
}

export default Home;
