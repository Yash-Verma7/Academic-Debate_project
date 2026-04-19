import { useState } from 'react';

function ArgumentBox({ onSend, joinedSide }) {
  const [content, setContent] = useState('');
  const [side, setSide] = useState('pro');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!content.trim()) return;

    onSend({ content: content.trim(), side: joinedSide || side });
    setContent('');
  };

  const clearInput = () => {
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: 16 }}>
      <select
        value={joinedSide || side}
        onChange={(event) => setSide(event.target.value)}
        disabled={Boolean(joinedSide)}
      >
        <option value="pro">Pro</option>
        <option value="con">Con</option>
      </select>
      <textarea
        rows={3}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write your point..."
      />
      <div className="button-group">
        <button type="submit" className="success">
          Send Argument
        </button>
        <button type="button" className="ghost" onClick={clearInput}>
          Clear
        </button>
      </div>
    </form>
  );
}

export default ArgumentBox;
