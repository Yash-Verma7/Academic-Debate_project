import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import ArgumentBox from '../components/ArgumentBox';
import MessageList from '../components/MessageList';

function DebateRoom() {
  const { debateId } = useParams();
  const [debate, setDebate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  const token = useMemo(() => localStorage.getItem('token'), []);

  useEffect(() => {
    const loadDebate = async () => {
      try {
        const { data } = await api.get(`/debates/${debateId}`);
        setDebate(data);
        setMessages(data.arguments || []);
      } catch (apiError) {
        setError(apiError.response?.data?.message || 'Failed to load debate room');
      }
    };

    loadDebate();
  }, [debateId]);

  useEffect(() => {
    if (!token) return undefined;

    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }

    socket.emit('joinDebate', debateId);

    const onNewArgument = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    const onError = (payload) => {
      setError(payload?.message || 'Socket error');
    };

    socket.on('newArgument', onNewArgument);
    socket.on('errorMessage', onError);

    return () => {
      socket.off('newArgument', onNewArgument);
      socket.off('errorMessage', onError);
    };
  }, [debateId, token]);

  const handleSend = ({ content, type }) => {
    socket.emit('sendArgument', {
      debateId,
      content,
      type,
      roundNumber: 1
    });
  };

  return (
    <div className="card">
      <Link to="/debates">← Back to debates</Link>
      <h2>{debate?.title || 'Debate Room'}</h2>
      <p className="subtle">{debate?.topic}</p>
      {error && <p className="error-text">{error}</p>}
      <MessageList messages={messages} />
      <ArgumentBox onSend={handleSend} />
    </div>
  );
}

export default DebateRoom;
