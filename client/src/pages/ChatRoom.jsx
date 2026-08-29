import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import MessageBubble from '../components/MessageBubble';
import UserList from '../components/UserList';
import RoomTimer from '../components/RoomTimer';
import TypingIndicator from '../components/TypingIndicator';
import { Hand, MessageSquare, Loader2, Clock, Home, Users, Copy, Link, Check, LogOut, SendHorizontal, Plus, Ghost, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ChatRoom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const {
    isConnected,
    messages,
    users,
    room,
    typingUsers,
    isExpired,
    socketId,
    isSecure,
    joinRoom,
    sendMessage,
    sendFile,
    sendTyping,
    addReaction,
  } = useSocket(window.location.hash.substring(1));

  const [nickname, setNickname] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) return;
    setJoinError('');
    try {
      await joinRoom(code, name);
      setShowNicknameModal(false);
      setJoined(true);
    } catch (err) {
      setJoinError(err.message);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText, isGhostMode);
    setInputText('');
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Refocus input to keep mobile keyboard open
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Maximum size is 5MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      sendFile(reader.result, file.name, file.type);
      // If there is text in the input, send it as a separate message right after
      if (inputText.trim()) {
        sendMessage(inputText, isGhostMode);
        setInputText('');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const copyInviteLink = useCallback(() => {
    const link = `${window.location.origin}/room/${code}${window.location.hash}`;
    navigator.clipboard.writeText(link).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  }, [code]);

  const handleLeave = () => {
    navigate('/');
  };

  // Nickname modal
  if (showNicknameModal) {
    return (
      <div className="modal-overlay">
        <div className="glass-card modal">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hand className="icon" size={24} style={{ color: 'var(--accent-orange)' }} /> 
            Enter your nickname
          </h2>
          <p>Choose a display name for this chat session. This won't be saved anywhere.</p>
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <input
                id="nickname-input"
                className="input-field"
                type="text"
                placeholder="Your nickname..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={25}
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!nickname.trim() || !isConnected}
              id="join-btn"
            >
              {isConnected ? <><MessageSquare size={18} /> Join Chat</> : <><Loader2 className="spinner" size={18} style={{ animation: 'spin 2s linear infinite' }} /> Connecting...</>}
            </button>
            {joinError && <p className="error-text">{joinError}</p>}
          </form>
        </div>
      </div>
    );
  }

  // Room expired overlay
  if (isExpired) {
    return (
      <div className="expired-overlay">
        <div className="glass-card expired-card">
          <div className="icon"><Clock size={48} style={{ color: 'var(--text-muted)' }} /></div>
          <h2>Room Expired</h2>
          <p>This chatroom has expired and all messages have been deleted. Thanks for chatting!</p>
          <button className="btn btn-primary" onClick={handleLeave} id="go-home-btn">
            <Home size={18} /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!joined || !room) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span className="loading-text">Joining room…</span>
      </div>
    );
  }

  // Filter out own typing indicator
  const otherTyping = typingUsers.filter((u) => u.userId !== socketId);

  return (
    <div className="chat-layout">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="chat-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <img src={theme === 'dark' ? "/logo-dark.jpg" : "/logo-light.jpg"} alt="FlashChat Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <h1 className="home-logo" style={{ fontSize: '1.25rem', margin: 0 }}>Flash<span>Chat</span></h1>
          </div>
          <h2>{room.name}</h2>
          <div
            className="room-code-badge"
            onClick={copyCode}
            title="Click to copy"
          >
            <Copy size={14} style={{ flexShrink: 0 }} /> {code}
            {copied && <span className="copied-text">Copied!</span>}
          </div>
        </div>

        <UserList users={users} currentUserId={socketId} />

        <div className="chat-sidebar-footer">
          <button 
            className="btn btn-secondary" 
            onClick={copyInviteLink} 
            style={{ marginBottom: '10px' }}
          >
            {inviteCopied ? <><Check size={16} /> Invite Link Copied!</> : <><Link size={16} /> Invite to Room</>}
          </button>
          <button className="btn btn-danger" onClick={handleLeave} id="leave-room-btn">
            <LogOut size={16} /> Leave Room
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        <div className="chat-header">
          <div className="chat-header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              id="mobile-menu-btn"
            >
              <Menu size={24} />
            </button>
            <div className="room-info-container">
              <h2 className="room-title">
                <span className="room-name-text">{room.name}</span>
                <span className="room-code">#{room.code}</span>
              </h2>
              <div className="room-meta">
                <p className="room-subtitle">
                  <Users size={14} /> {users.length} online
                </p>
                {isSecure && (
                  <span className="e2ee-badge">
                    <span role="img" aria-label="encrypted">🔒</span> <span className="e2ee-text">Encrypted</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="chat-header-right">
            <RoomTimer expiresAt={room.expiresAt} />
            <button className="theme-toggle-btn chat-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="chat-messages" id="messages-container">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.userId === socketId}
              addReaction={addReaction}
              roomUsers={users}
              currentUserId={socketId}
            />
          ))}
          {otherTyping.length > 0 && (
            <TypingIndicator typingUsers={otherTyping} />
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area floating">
          <form className="chat-input-container" onSubmit={handleSend}>
            <label className="icon-action-btn" title="Attach File" style={{ cursor: 'pointer' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Plus size={24} />
            </label>
            
            <div className="chat-input-pill">
              <input
                ref={inputRef}
                id="message-input"
                className="chat-input"
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={handleInputChange}
                autoFocus
                autoComplete="off"
              />
              <button
                type="button"
                className={`icon-action-btn ghost-btn ${isGhostMode ? 'active' : ''}`}
                onClick={() => setIsGhostMode(!isGhostMode)}
                title={isGhostMode ? 'Ghost Mode ON (Messages burn in 10s)' : 'Turn on Ghost Mode'}
              >
                <Ghost size={20} />
              </button>
            </div>
            <button
              className="send-pill-btn"
              type="submit"
              disabled={!inputText.trim()}
              id="send-message-btn"
            >
              <span className="send-text">Send</span> <SendHorizontal size={16} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
