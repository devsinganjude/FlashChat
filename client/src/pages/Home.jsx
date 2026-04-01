import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://YOUR_RENDER_URL_HERE');

export default function Home() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [duration, setDuration] = useState(15);
  const [joinCode, setJoinCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!roomName.trim()) {
      setCreateError('Please enter a room name.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName.trim(), duration: Number(duration) }),
      });
      const data = await res.json();
      if (data.error) {
        setCreateError(data.error);
      } else {
        navigate(`/room/${data.room.code}`);
      }
    } catch {
      setCreateError('Failed to create room. Is the server running?');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    setJoinError('');
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError('Please enter a room code.');
      return;
    }
    if (code.length !== 6) {
      setJoinError('Room codes are 6 characters long.');
      return;
    }
    navigate(`/room/${code}`);
  };



  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="home-logo">
          Flash<span>Chat</span>
        </h1>
        <p className="home-tagline">
          Create temporary chatrooms that disappear. No sign-up.
          No history. Just conversations.
        </p>
      </header>

      <div className="home-grid">
        {/* Create Room Card */}
        <div className="glass-card home-card">
          <h2>
            <span className="icon">✨</span>
            Create a Room
          </h2>
          <p>Start a new temporary chatroom for your group.</p>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="room-name">Room Name</label>
              <input
                id="room-name"
                className="input-field"
                type="text"
                placeholder="e.g. Team Standup"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label htmlFor="room-duration">Duration</label>
              <select
                id="room-duration"
                className="select-field"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
              </select>
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={creating}
              id="create-room-btn"
            >
              {creating ? 'Creating…' : '🚀 Create Room'}
            </button>
            {createError && <p className="error-text">{createError}</p>}
          </form>
        </div>

        {/* Join Room Card */}
        <div className="glass-card home-card">
          <h2>
            <span className="icon">🔗</span>
            Join a Room
          </h2>
          <p>Enter a room code to join an existing conversation.</p>
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label htmlFor="join-code">Room Code</label>
              <input
                id="join-code"
                className="input-field"
                type="text"
                placeholder="e.g. AB3XYZ"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ letterSpacing: '0.15em', fontWeight: 600 }}
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              id="join-room-btn"
              style={{ marginTop: 'auto' }}
            >
              🚪 Join Room
            </button>
            {joinError && <p className="error-text">{joinError}</p>}
          </form>
        </div>
      </div>


    </div>
  );
}
