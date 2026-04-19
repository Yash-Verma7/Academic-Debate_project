import { useEffect, useState } from 'react';
import TopNav from '../components/TopNav';
import api from '../services/api';
import UserAvatar from '../components/UserAvatar';

const composeDisplayName = (user) => {
  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim();
  return parts || user.name || 'User';
};

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError('');
        const params = { all: true };
        if (search.trim()) {
          params.search = search.trim();
        }
        const { data } = await api.get('/api/leaderboard', { params });
        setLeaders(data);
      } catch (apiError) {
        setError(apiError.response?.data?.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [search]);

  return (
    <div className="leaderboard-page-modern">
      <TopNav />
      <div className="leaderboard-shell leaderboard-wrapper">
        <section className="leaderboard-card-modern leaderboard-card">
          <div className="leaderboard-header-modern">
            <div>
              <h1 className="leaderboard-title-modern">Leaderboard</h1>
              <p className="leaderboard-subtitle-modern">Highest scoring debaters in the community</p>
            </div>
            <div className="leaderboard-search-wrap">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name..."
                className="leaderboard-search-input"
                aria-label="Search users by name"
              />
            </div>
          </div>

          {loading && <p className="subtle">Loading leaderboard...</p>}
          {error && <p className="error-text">{error}</p>}

          {!loading && !error && leaders.length === 0 && (
            <p className="leaderboard-empty-state">No users found</p>
          )}

          {!loading && !error && leaders.length > 0 && (
            <div className="leaderboard-rows-modern leaderboard-container">
              {leaders.map((leader, index) => {
                const displayName = composeDisplayName(leader);
                const isTopRank = index === 0;
                const isTopThree = index < 3;

                return (
                  <article
                    key={leader._id || `${displayName}-${index}`}
                    className={`leaderboard-row-modern ${isTopRank ? 'leaderboard-row-top' : ''} ${isTopThree ? 'leaderboard-row-top-three' : ''}`}
                  >
                    <div className={`leaderboard-rank-pill ${isTopRank ? 'rank-one' : ''}`}>#{index + 1}</div>

                    <UserAvatar
                      src={leader.profileImage || leader.avatarUrl}
                      name={displayName}
                      size="md"
                      className="leaderboard-avatar-modern"
                    />

                    <div className="leaderboard-user-meta">
                      <h3>{displayName}</h3>
                      <p>{leader.role || 'Participant'}</p>
                    </div>

                    <div className="leaderboard-points-modern">
                      <span className="points-value">{leader.points ?? 0}</span>
                      <span className="points-label">Points</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Leaderboard;
