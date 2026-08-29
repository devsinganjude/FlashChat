import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSecureKey } from '../utils/crypto';
import { Sparkles, Rocket, Link, LogIn, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

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
  const { theme, toggleTheme } = useTheme();

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
        const key = await generateSecureKey();
        navigate(`/room/${data.room.code}#${key}`);
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
    let input = joinCode.trim();
    if (!input) {
      setJoinError('Please enter a room code or link.');
      return;
    }

    try {
      const url = new URL(input);
      if (url.pathname.startsWith('/room/')) {
        navigate(url.pathname + url.hash);
        return;
      }
    } catch {
      // Not a URL
    }

    input = input.toUpperCase();
    if (input.length !== 6) {
      setJoinError('Invalid room code or link.');
      return;
    }
    navigate(`/room/${input}`);
  };



  return (
    <div className="home-container">
      <header className="home-header">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', position: 'absolute', top: 0, right: 0 }}>
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div className="home-logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
          <img src={theme === 'dark' ? "/logo-dark.jpg" : "/logo-light.jpg"} alt="FlashChat Logo" style={{ width: '48px', height: '48px', borderRadius: '12px', boxShadow: 'var(--shadow-glow)' }} />
          <h1 className="home-logo" style={{ marginBottom: 0 }}>Flash<span>Chat</span></h1>
        </div>
        <p className="home-tagline">
          Create temporary chatrooms that disappear. No sign-up.
          No history. Just conversations.
        </p>
      </header>

      <div className="home-grid">
        {/* Create Room Card */}
        <div className="glass-card home-card">
          <h2>
            <Sparkles className="icon" size={20} style={{ color: 'var(--accent-purple)' }} />
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
              <label>Duration</label>
              <div className="duration-options">
                {[5, 15, 30, 60].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`duration-btn ${Number(duration) === val ? 'active' : ''}`}
                    onClick={() => setDuration(val)}
                  >
                    {val === 60 ? '1 Hour' : `${val} Mins`}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={creating}
              id="create-room-btn"
            >
              {creating ? 'Creating…' : <><Rocket size={18} /> Create Room</>}
            </button>
            {createError && <p className="error-text">{createError}</p>}
          </form>
        </div>

        {/* Join Room Card */}
        <div className="glass-card home-card">
          <h2>
            <Link className="icon" size={20} style={{ color: 'var(--accent-blue)' }} />
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
              <LogIn size={18} /> Join Room
            </button>
            {joinError && <p className="error-text">{joinError}</p>}
          </form>
        </div>
      </div>


    </div>
  );
}
