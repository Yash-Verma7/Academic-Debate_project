import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import TopNav from '../components/TopNav';
import UserAvatar from '../components/UserAvatar';

const composeDisplayName = (user) => {
  if (!user) return 'User';
  const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim();
  return parts || user.name || 'User';
};

const TYPE_OPTIONS = [
  { value: 'argument', label: 'Argument' },
  { value: 'rebuttal', label: 'Rebuttal' },
  { value: 'question', label: 'Question' }
];

function DebateRoom() {
  const { debateId } = useParams();
  const [debate, setDebate] = useState(null);
  const [channelMessages, setChannelMessages] = useState({ pro: [], con: [], audience: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [countdownLabel, setCountdownLabel] = useState('Starts In');
  const [voteSummary, setVoteSummary] = useState({
    overall: { pro: 0, con: 0 },
    student: { pro: 0, con: 0 },
    professional: { pro: 0, con: 0 }
  });

  const [proInput, setProInput] = useState('');
  const [conInput, setConInput] = useState('');
  const [audienceInput, setAudienceInput] = useState('');
  const [proType, setProType] = useState('argument');
  const [conType, setConType] = useState('argument');

  const lastSentRef = useRef({});
  const proMessagesRef = useRef(null);
  const conMessagesRef = useRef(null);
  const audienceMessagesRef = useRef(null);

  const token = useMemo(() => localStorage.getItem('token'), []);
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

  const proParticipant = debate?.participants?.proUser || null;
  const conParticipant = debate?.participants?.conUser || null;
  const normalizedUserRole = (user?.role || '').toLowerCase();
  const isStudentRole = normalizedUserRole === 'student';
  const isModeratorOrOtherRole =
    normalizedUserRole === 'moderator' || normalizedUserRole === 'professional' || normalizedUserRole === 'other';
  const isProUser = Boolean(proParticipant?._id && proParticipant._id === user.id);
  const isConUser = Boolean(conParticipant?._id && conParticipant._id === user.id);
  const isParticipant = isProUser || isConUser;
  const debateRole = isProUser ? 'pro' : isConUser ? 'con' : 'audience';
  const bothSidesFilled = Boolean(proParticipant?._id && conParticipant?._id);
  const canShowJoinButtons = isStudentRole && !isParticipant;

  const loadMessages = useCallback(async () => {
    const { data } = await api.get(`/api/messages/${debateId}/grouped`);
    setChannelMessages({
      pro: data?.pro || [],
      con: data?.con || [],
      audience: data?.audience || []
    });
  }, [debateId]);

  const loadDebate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get(`/api/debates/${debateId}`);
      setDebate(data);
      if (data.voteSummary) {
        setVoteSummary(data.voteSummary);
      }

      const viewedDebate = {
        _id: data._id,
        title: data.title,
        topic: data.topic,
        category: data.category,
        scheduledTime: data.scheduledTime,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        watchersCount: data.watchersCount,
        createdBy: data.createdBy
          ? {
              _id: data.createdBy._id,
              name: data.createdBy.name,
              profileImage: data.createdBy.profileImage,
              avatarUrl: data.createdBy.avatarUrl
            }
          : null,
        createdAt: data.createdAt
      };

      const viewedList = JSON.parse(localStorage.getItem('recentlyViewedDebates') || '[]');
      const updatedViewed = [viewedDebate, ...viewedList.filter((item) => item._id !== data._id)].slice(0, 5);
      localStorage.setItem('recentlyViewedDebates', JSON.stringify(updatedViewed));

      const watchKey = `debate_watch_${user.id}_${debateId}`;
      const hasWatched = localStorage.getItem(watchKey) === '1';
      if (!hasWatched) {
        await api.post(`/api/debates/${debateId}/watch`);
        localStorage.setItem(watchKey, '1');
      }

      await loadMessages();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to load debate room');
    } finally {
      setLoading(false);
    }
  }, [debateId, loadMessages, user.id]);

  useEffect(() => {
    loadDebate();
  }, [loadDebate]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadDebate().catch(() => {});
    }, 15000);

    return () => clearInterval(intervalId);
  }, [loadDebate]);

  useEffect(() => {
    const startValue = debate?.startTime || debate?.scheduledTime;
    const endValue = debate?.endTime;

    if (!startValue || !endValue) {
      setSecondsLeft(0);
      setCountdownLabel('Starts In');
      return undefined;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const start = new Date(startValue).getTime();
      const end = new Date(endValue).getTime();

      if (now < start) {
        setCountdownLabel('Starts In');
        setSecondsLeft(Math.max(0, Math.floor((start - now) / 1000)));
        return;
      }

      if (now >= start && now < end) {
        setCountdownLabel('Ends In');
        setSecondsLeft(Math.max(0, Math.floor((end - now) / 1000)));
        return;
      }

      setCountdownLabel('Ended');
      setSecondsLeft(0);
    };

    updateCountdown();
    const timerId = setInterval(updateCountdown, 1000);

    return () => clearInterval(timerId);
  }, [debate?.startTime, debate?.scheduledTime, debate?.endTime]);

  useEffect(() => {
    if (!token) return undefined;

    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    socket.emit('joinDebate', debateId);

    const onNewArgument = (payload) => {
      const role = payload?.role || payload?.side || 'audience';
      if (!['pro', 'con', 'audience'].includes(role)) return;

      setChannelMessages((prev) => {
        const current = prev[role] || [];
        if (current.some((entry) => entry._id === payload._id)) {
          return prev;
        }

        return {
          ...prev,
          [role]: [...current, payload]
        };
      });
    };

    const onDebateUpdated = (payload) => {
      if (payload?.debateId !== debateId) return;

      setDebate((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          status: payload.status ?? prev.status,
          startTime: payload.startTime ?? prev.startTime,
          endTime: payload.endTime ?? prev.endTime,
          scheduledTime: payload.scheduledTime ?? prev.scheduledTime,
          watchersCount: payload.watchersCount ?? prev.watchersCount,
          proVotes: payload.proVotes ?? prev.proVotes,
          conVotes: payload.conVotes ?? prev.conVotes,
          participants: payload.participants || prev.participants
        };
      });

      if (payload.voteSummary) {
        setVoteSummary(payload.voteSummary);
      }
    };

    const onDebateStatusChanged = (payload) => {
      if (payload?.debateId !== debateId) return;
      setDebate((prev) => (prev ? { ...prev, status: payload.status } : prev));
    };

    const onSocketError = (payload) => {
      setError(payload?.message || 'Socket error');
    };

    socket.on('newArgument', onNewArgument);
    socket.on('debateUpdated', onDebateUpdated);
    socket.on('debateStatusChanged', onDebateStatusChanged);
    socket.on('errorMessage', onSocketError);

    return () => {
      socket.off('newArgument', onNewArgument);
      socket.off('debateUpdated', onDebateUpdated);
      socket.off('debateStatusChanged', onDebateStatusChanged);
      socket.off('errorMessage', onSocketError);
    };
  }, [debateId, token]);

  const joinSide = async (side) => {
    try {
      setError('');
      const { data } = await api.post(`/api/debates/${debateId}/join`, { side });
      setDebate(data.debate);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to join debate side');
    }
  };

  const submitVote = async (side) => {
    try {
      setError('');
      const { data } = await api.post(`/api/debates/${debateId}/vote`, { side });
      setDebate(data.debate);
      if (data.debate?.voteSummary) {
        setVoteSummary(data.debate.voteSummary);
      }
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Failed to submit vote');
    }
  };

  const sendRoleMessage = (role) => {
    const isRoleAllowed =
      role === 'audience' ||
      (role === 'pro' && isProUser) ||
      (role === 'con' && isConUser);

    if (!isRoleAllowed) {
      setError('You are not allowed to send messages in this channel');
      return;
    }

    const textByRole = {
      pro: proInput,
      con: conInput,
      audience: audienceInput
    };

    const typeByRole = {
      pro: proType,
      con: conType,
      audience: 'argument'
    };

    const rawText = textByRole[role] || '';
    const trimmedText = rawText.trim();

    if (!trimmedText) {
      setError('Enter a message before sending');
      return;
    }

    const normalizedType = typeByRole[role] || 'argument';
    const dedupeKey = `${role}:${normalizedType}:${trimmedText.toLowerCase()}`;
    const lastSent = lastSentRef.current[dedupeKey] || 0;
    if (Date.now() - lastSent < 1500) {
      setError('Duplicate message blocked. Please wait a moment.');
      return;
    }

    lastSentRef.current[dedupeKey] = Date.now();
    setError('');

    socket.emit('sendMessage', {
      debateId,
      role,
      type: normalizedType,
      content: trimmedText
    });

    if (role === 'pro') setProInput('');
    if (role === 'con') setConInput('');
    if (role === 'audience') setAudienceInput('');
  };

  const formatTimestamp = (value) => new Date(value || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatCountdown = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const totalVotes = (debate?.proVotes || 0) + (debate?.conVotes || 0);
  const proPercent = totalVotes ? Math.round(((debate?.proVotes || 0) * 100) / totalVotes) : 0;
  const conPercent = totalVotes ? 100 - proPercent : 0;
  const currentUserVote = debate?.currentUserVote || null;

  const showProInput = isProUser;
  const showConInput = isConUser;

  useEffect(() => {
    if (proMessagesRef.current) {
      proMessagesRef.current.scrollTo({ top: proMessagesRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [channelMessages.pro.length]);

  useEffect(() => {
    if (conMessagesRef.current) {
      conMessagesRef.current.scrollTo({ top: conMessagesRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [channelMessages.con.length]);

  useEffect(() => {
    if (audienceMessagesRef.current) {
      audienceMessagesRef.current.scrollTo({ top: audienceMessagesRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [channelMessages.audience.length]);

  return (
    <div className="dashboard-page debate-room-v2-page">
      <TopNav />
      <div className="panel">
        <div className="panel-content">
          <div className="toolbar">
            <Link to="/debate-rooms">← Back to debates</Link>
          </div>

          <div className="debate-room-v2-top">
            <div>
              <div className="room-head">
                <h2 style={{ marginBottom: 8 }}>{debate?.title || 'Debate Room'}</h2>
                <span
                  className={`status-badge ${debate?.status === 'live' ? 'status-live' : debate?.status === 'completed' ? 'status-completed' : 'status-upcoming'}`}
                >
                  {(debate?.status || 'upcoming').toUpperCase()}
                </span>
              </div>
              <p className="subtle" style={{ marginTop: 4 }}>Topic: {debate?.topic || 'No topic added'}</p>
              <p className="subtle">Hosted by {composeDisplayName(debate?.createdBy)}</p>
            </div>

            <div className="debate-top-stats-card">
              <div className="debate-top-stat-item">
                <span>Watchers</span>
                <strong>{debate?.watchersCount || 0}</strong>
              </div>
              <div className="debate-top-stat-item">
                <span>{countdownLabel}</span>
                <strong>{formatCountdown(secondsLeft)}</strong>
              </div>
              <div className="debate-top-stat-item">
                <span>Total Votes</span>
                <strong>{totalVotes}</strong>
              </div>
            </div>
          </div>

          {loading && <p className="subtle">Loading debate room...</p>}
          {error && <p className="error-text">{error}</p>}

          {!loading && (
            <div className="debate-room-v2-layout">
              <section className="debate-main-column-v2">
                <div className="participants-v2-card">
                  <div className="participants-v2-header">
                    <h3 className="section-title">Participants</h3>
                  </div>

                  <div className="participants-v2-grid">
                    <div className="participant-v2-box pro-side">
                      <div className="participant-v2-title">Pro</div>
                      {proParticipant ? (
                        <div className="participant-v2-user">
                          <UserAvatar
                            src={proParticipant.profileImage || proParticipant.avatarUrl}
                            name={composeDisplayName(proParticipant)}
                            size="md"
                          />
                          <div>
                            <strong>{composeDisplayName(proParticipant)}</strong>
                            <div className="role-pill">Pro Speaker</div>
                          </div>
                        </div>
                      ) : (
                        <div className="subtle">No Pro participant yet</div>
                      )}

                      {canShowJoinButtons && (
                        <button
                          type="button"
                          className="info"
                          onClick={() => joinSide('pro')}
                          disabled={Boolean(proParticipant)}
                        >
                          {proParticipant ? 'Pro Filled' : 'Join as Pro'}
                        </button>
                      )}
                    </div>

                    <div className="participant-v2-box con-side">
                      <div className="participant-v2-title">Con</div>
                      {conParticipant ? (
                        <div className="participant-v2-user">
                          <UserAvatar
                            src={conParticipant.profileImage || conParticipant.avatarUrl}
                            name={composeDisplayName(conParticipant)}
                            size="md"
                          />
                          <div>
                            <strong>{composeDisplayName(conParticipant)}</strong>
                            <div className="role-pill">Con Speaker</div>
                          </div>
                        </div>
                      ) : (
                        <div className="subtle">No Con participant yet</div>
                      )}

                      {canShowJoinButtons && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => joinSide('con')}
                          disabled={Boolean(conParticipant)}
                        >
                          {conParticipant ? 'Con Filled' : 'Join as Con'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="arguments-v2-grid">
                  <section className="argument-panel-v2 pro-panel">
                    <h3 className="section-title">Pro Arguments</h3>
                    <div className="argument-message-list-v2" ref={proMessagesRef}>
                      {channelMessages.pro.length === 0 && <p className="subtle">No Pro messages yet.</p>}
                      {channelMessages.pro.map((message) => (
                        <article key={message._id} className="argument-item-v2">
                          <div className="argument-head-v2">
                            <span className="participant-inline-user">
                              <UserAvatar
                                src={message.userId?.profileImage || message.userId?.avatarUrl}
                                name={composeDisplayName(message.userId)}
                                size="xs"
                              />
                              <strong>{composeDisplayName(message.userId)}</strong>
                            </span>
                            <span className="message-type-pill">{message.type || 'argument'}</span>
                          </div>
                          <p>{message.content}</p>
                          <span className="bubble-meta">{formatTimestamp(message.createdAt)}</span>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="argument-panel-v2 con-panel">
                    <h3 className="section-title">Con Arguments</h3>
                    <div className="argument-message-list-v2" ref={conMessagesRef}>
                      {channelMessages.con.length === 0 && <p className="subtle">No Con messages yet.</p>}
                      {channelMessages.con.map((message) => (
                        <article key={message._id} className="argument-item-v2">
                          <div className="argument-head-v2">
                            <span className="participant-inline-user">
                              <UserAvatar
                                src={message.userId?.profileImage || message.userId?.avatarUrl}
                                name={composeDisplayName(message.userId)}
                                size="xs"
                              />
                              <strong>{composeDisplayName(message.userId)}</strong>
                            </span>
                            <span className="message-type-pill">{message.type || 'argument'}</span>
                          </div>
                          <p>{message.content}</p>
                          <span className="bubble-meta">{formatTimestamp(message.createdAt)}</span>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="chat-input-stack-v2">
                  {showProInput && (
                    <div className="channel-input-card-v2 pro-channel-input">
                      <div className="channel-input-head-v2">
                        <h4>Pro Chat Box</h4>
                        <select value={proType} onChange={(event) => setProType(event.target.value)}>
                          {TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="message-send-row">
                        <input
                          placeholder="Share your Pro point..."
                          value={proInput}
                          onChange={(event) => setProInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              sendRoleMessage('pro');
                            }
                          }}
                        />
                        <button type="button" onClick={() => sendRoleMessage('pro')}>Send Pro</button>
                      </div>
                    </div>
                  )}

                  {showConInput && (
                    <div className="channel-input-card-v2 con-channel-input">
                      <div className="channel-input-head-v2">
                        <h4>Con Chat Box</h4>
                        <select value={conType} onChange={(event) => setConType(event.target.value)}>
                          {TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="message-send-row">
                        <input
                          placeholder="Share your Con point..."
                          value={conInput}
                          onChange={(event) => setConInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              sendRoleMessage('con');
                            }
                          }}
                        />
                        <button type="button" onClick={() => sendRoleMessage('con')}>Send Con</button>
                      </div>
                    </div>
                  )}

                  {isStudentRole && !isParticipant && bothSidesFilled && (
                    <p className="subtle">Pro and Con positions are filled. You can still participate in Live Audience Chat.</p>
                  )}

                  {!isStudentRole && !isParticipant && (
                    <p className="subtle">Only students can join Pro or Con. You can participate in Live Audience Chat.</p>
                  )}

                  {isStudentRole && isParticipant && (
                    <p className="subtle">You joined as <strong>{debateRole.toUpperCase()}</strong>. You can post only in your side and live audience chat.</p>
                  )}

                  {isModeratorOrOtherRole && (
                    <p className="subtle">Role access: audience chat only.</p>
                  )}
                </div>
              </section>

              <aside className="debate-sidebar-column-v2">
                <div className="live-chat-card-v2">
                  <div className="channel-input-head-v2">
                    <h4>Live Audience Chat</h4>
                  </div>

                  <div className="audience-chat-feed-v2" ref={audienceMessagesRef}>
                    {channelMessages.audience.length === 0 && <p className="subtle">No audience messages yet.</p>}
                    {channelMessages.audience.map((message) => (
                      <article key={message._id} className="argument-item-v2 audience-item-v2">
                        <div className="argument-head-v2">
                          <span className="participant-inline-user">
                            <UserAvatar
                              src={message.userId?.profileImage || message.userId?.avatarUrl}
                              name={composeDisplayName(message.userId)}
                              size="xs"
                            />
                            <strong>{composeDisplayName(message.userId)}</strong>
                          </span>
                          <span className="message-type-pill audience-type">live</span>
                        </div>
                        <p>{message.content}</p>
                        <span className="bubble-meta">{formatTimestamp(message.createdAt)}</span>
                      </article>
                    ))}
                  </div>

                  <div className="live-chat-input-wrap-v2">
                    <div className="message-send-row">
                      <input
                        placeholder="Share your audience opinion..."
                        value={audienceInput}
                        onChange={(event) => setAudienceInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            sendRoleMessage('audience');
                          }
                        }}
                      />
                      <button type="button" onClick={() => sendRoleMessage('audience')}>Send</button>
                    </div>
                  </div>
                </div>

                <div className="poll-card-v2">
                  <h3 className="section-title">Live Opinion Poll</h3>

                  <div className="poll-action-row-v2">
                    <button
                      type="button"
                      className={currentUserVote === 'pro' ? 'success' : 'ghost'}
                      onClick={() => submitVote('pro')}
                    >
                      Vote Pro
                    </button>
                    <button
                      type="button"
                      className={currentUserVote === 'con' ? 'success' : 'ghost'}
                      onClick={() => submitVote('con')}
                    >
                      Vote Con
                    </button>
                  </div>

                  <div className="poll-row-v2">
                    <div className="poll-label-v2">
                      <span>Pro</span>
                      <strong>{proPercent}%</strong>
                    </div>
                    <div className="poll-track">
                      <div className="poll-fill pro" style={{ width: `${proPercent}%` }} />
                    </div>
                  </div>

                  <div className="poll-row-v2">
                    <div className="poll-label-v2">
                      <span>Con</span>
                      <strong>{conPercent}%</strong>
                    </div>
                    <div className="poll-track">
                      <div className="poll-fill con" style={{ width: `${conPercent}%` }} />
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DebateRoom;
