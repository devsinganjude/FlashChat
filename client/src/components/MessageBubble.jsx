import React from 'react';

export default function MessageBubble({ message, isOwn }) {
  const { type, userName, text, timestamp, fileData, fileName, fileType } = message;

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

  const renderContent = () => {
    if (type === 'file') {
      if (fileType?.startsWith('image/')) {
        return (
          <div className="message-bubble file-bubble">
            <img src={fileData} alt={fileName} className="message-image" />
          </div>
        );
      }
      return (
        <div className="message-bubble file-bubble">
          <a href={fileData} download={fileName} className="file-download">
            📎 Download {fileName}
          </a>
        </div>
      );
    }
    return <div className="message-bubble">{text}</div>;
  };

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && <span className="message-sender">{userName}</span>}
      {renderContent()}
      <span className="message-time">{time}</span>
    </div>
  );
}
