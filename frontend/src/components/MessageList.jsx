function MessageList({ messages }) {
  if (!messages.length) {
    return <p className="subtle">No arguments yet. Start the debate.</p>;
  }

  return (
    <div className="messages">
      {messages.map((message) => (
        <div key={message._id} className="message">
          <div className="row spread">
            <strong>{message.userId?.name || 'Anonymous'}</strong>
            <span className="subtle">{new Date(message.createdAt || Date.now()).toLocaleTimeString()}</span>
          </div>
          <div className="message-type subtle">{message.side?.toUpperCase() || 'SIDE'}</div>
          <div>{message.content}</div>
        </div>
      ))}
    </div>
  );
}

export default MessageList;
