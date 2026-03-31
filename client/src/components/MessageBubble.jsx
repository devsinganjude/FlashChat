import React from 'react';

export default function MessageBubble({ message, isOwn }) {
  const { type, userName, text, timestamp } = message;

  if (type === 'system') {
    return (
      <div className="message-system">
        <div className="message-bubble">{text}</div>
      </div>
    );
  }

  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && <span className="message-sender">{userName}</span>}
      <div className="message-bubble">{text}</div>
      <span className="message-time">{time}</span>
    </div>
  );
}
