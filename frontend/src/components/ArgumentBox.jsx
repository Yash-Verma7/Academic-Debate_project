import { useState } from 'react';

function ArgumentBox({ onSend }) {
  const [content, setContent] = useState('');
  const [type, setType] = useState('argument');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!content.trim()) return;

    onSend({ content: content.trim(), type });
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: 16 }}>
      <select value={type} onChange={(event) => setType(event.target.value)}>
        <option value="argument">Argument</option>
        <option value="rebuttal">Rebuttal</option>
        <option value="question">Question</option>
      </select>
      <textarea
        rows={3}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write your point..."
      />
      <button type="submit">
        Send
      </button>
    </form>
  );
}

export default ArgumentBox;
