function MessageList({ messages }) {
  if (!messages.length) {
    return <p className="subtle">No arguments yet. Start the debate.</p>;
  }

  return (
    <div className="messages">
      {messages.map((message) => (
        <div key={message._id} className="message">
          <strong>{message.userId?.name || 'Anonymous'}</strong> ({message.type}): {message.content}
        </div>
      ))}
    </div>
  );
}

export default MessageList;
