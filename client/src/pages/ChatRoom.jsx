import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import MessageBubble from '../components/MessageBubble';
import UserList from '../components/UserList';
import RoomTimer from '../components/RoomTimer';
import TypingIndicator from '../components/TypingIndicator';

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
    joinRoom,
    sendMessage,
    sendTyping,
  } = useSocket();

  const [nickname, setNickname] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [inputText, setInputText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
    sendMessage(inputText);
    setInputText('');
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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

  const handleLeave = () => {
    navigate('/');
  };

  // Nickname modal
  if (showNicknameModal) {
    return (
      <div className="modal-overlay">
        <div className="glass-card modal">
          <h2>👋 Enter your nickname</h2>
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
              {isConnected ? '🎉 Join Chat' : '⏳ Connecting...'}
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
          <div className="icon">⏰</div>
          <h2>Room Expired</h2>
          <p>This chatroom has expired and all messages have been deleted. Thanks for chatting!</p>
          <button className="btn btn-primary" onClick={handleLeave} id="go-home-btn">
            🏠 Back to Home
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
          <h2>{room.name}</h2>
          <div
            className="room-code-badge"
            onClick={copyCode}
            title="Click to copy"
          >
            📋 {code}
            {copied && <span className="copied-text">Copied!</span>}
          </div>
        </div>

        <UserList users={users} currentUserId={socketId} />

        <div className="chat-sidebar-footer">
          <button className="btn btn-danger" onClick={handleLeave} id="leave-room-btn">
            🚪 Leave Room
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
              ☰
            </button>
            <h1>{room.name}</h1>
            <div
              className="room-code-badge"
              onClick={copyCode}
              title="Click to copy"
              style={{ display: 'none' }}
            >
              {code}
            </div>
          </div>
          <div className="chat-header-right">
            <RoomTimer expiresAt={room.expiresAt} />
          </div>
        </div>

        <div className="chat-messages" id="messages-container">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.userId === socketId}
            />
          ))}
          {otherTyping.length > 0 && (
            <TypingIndicator typingUsers={otherTyping} />
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <form className="chat-input-form" onSubmit={handleSend}>
            <input
              id="message-input"
              type="text"
              placeholder="Type a message…"
              value={inputText}
              onChange={handleInputChange}
              autoFocus
              autoComplete="off"
            />
            <button
              className="send-btn"
              type="submit"
              disabled={!inputText.trim()}
              id="send-message-btn"
            >
              ➤
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
