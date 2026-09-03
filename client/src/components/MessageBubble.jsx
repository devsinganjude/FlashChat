import React, { useState, useEffect } from 'react';
import { Download, Flame } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👀', '🚀'];
const EXTENDED_EMOJIS = [
  '👍', '❤️', '😂', '🔥', '👀', '🚀', 
  '💯', '✨', '🎉', '🙌', '👏', '🙏', 
  '😢', '😡', '🤔', '🤯', '💀', '👽',
  '😭', '🥺', '😎', '🤓', '🤡', '💩'
];

export default React.memo(function MessageBubble({ message, isOwn, addReaction, roomUsers, currentUserId }) {
  const { id, type, userName, text, timestamp, fileData, fileName, fileType, isGhost, reactions } = message;
  const [isBurned, setIsBurned] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [showExtendedEmojis, setShowExtendedEmojis] = useState(false);
  const [showReactorsFor, setShowReactorsFor] = useState(null);

  // Close extended emojis when clicking anywhere else
  useEffect(() => {
    if (showExtendedEmojis) {
      const handleClickOutside = () => setShowExtendedEmojis(false);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [showExtendedEmojis]);
  
  useEffect(() => {
    if (isGhost && !isBurned) {
      // 10 seconds total: 8s normal, 2s burning animation
      const burnAnimTimer = setTimeout(() => {
        setIsBurning(true);
      }, 8000);
      
      const burnTimer = setTimeout(() => {
        setIsBurned(true);
        setIsBurning(false);
      }, 10000);
      
      return () => {
        clearTimeout(burnAnimTimer);
        clearTimeout(burnTimer);
      };
    }
  }, [isGhost, isBurned]);

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

  const handleReactionClick = (emoji) => {
    addReaction(id, emoji);
  };

  const renderContent = () => {
    if (isGhost && isBurned) {
      return (
        <div className="message-bubble ghost-burned">
          <Flame size={16} className="burn-icon" /> 
          Message expired
        </div>
      );
    }

    if (type === 'file') {
      if (fileType?.startsWith('image/')) {
        return (
          <div className={`message-bubble file-bubble ${isBurning ? 'burning' : ''}`}>
            {isGhost && <div className="ghost-indicator"><Flame size={14}/> Ghost Message</div>}
            <div className="media-container" style={{ position: 'relative', display: 'inline-block' }}>
              <img src={fileData} alt={fileName} className="message-image" />
              <a href={fileData} download={fileName} className="media-download-btn" title="Download Image">
                <Download size={16} />
              </a>
            </div>
          </div>
        );
      }
      if (fileType?.startsWith('video/')) {
        return (
          <div className={`message-bubble file-bubble ${isBurning ? 'burning' : ''}`}>
             {isGhost && <div className="ghost-indicator"><Flame size={14}/> Ghost Message</div>}
            <div className="media-container" style={{ position: 'relative', display: 'inline-block' }}>
              <video src={fileData} controls className="message-video" />
              <a href={fileData} download={fileName} className="media-download-btn" title="Download Video">
                <Download size={16} />
              </a>
            </div>
          </div>
        );
      }
      return (
        <div className={`message-bubble file-bubble ${isBurning ? 'burning' : ''}`}>
           {isGhost && <div className="ghost-indicator"><Flame size={14}/> Ghost Message</div>}
          <a href={fileData} download={fileName} className="file-download" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Download {fileName}
          </a>
        </div>
      );
    }
    
    // Markdown Text
    return (
      <div className={`message-bubble ${isBurning ? 'burning' : ''} ${isGhost ? 'ghost-bubble' : ''}`}>
        {isGhost && <div className="ghost-indicator"><Flame size={14}/> Ghost Message</div>}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, inline, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                <SyntaxHighlighter
                  {...props}
                  children={String(children).replace(/\n$/, '')}
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="code-block"
                />
              ) : (
                <code {...props} className="inline-code">
                  {children}
                </code>
              )
            }
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  // Render reactions list
  const reactionEntries = reactions ? Object.entries(reactions) : [];

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : 'other'} ${isGhost && isBurned ? 'burned-wrapper' : ''}`}>
      {!isOwn && <span className="message-sender">{userName}</span>}
      
      <div className="message-content-wrapper">
        {renderContent()}
        
        {/* Quick Reactions Menu */}
        {!isBurned && (
          <div className={`reaction-menu ${showExtendedEmojis ? 'extended' : ''}`}>
            {(showExtendedEmojis ? EXTENDED_EMOJIS : QUICK_EMOJIS).map(emoji => (
              <button 
                key={emoji} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionClick(emoji);
                  setShowExtendedEmojis(false);
                }}
                className="reaction-btn"
              >
                {emoji}
              </button>
            ))}
            {!showExtendedEmojis && (
              <button 
                className="reaction-btn custom-emoji-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExtendedEmojis(true);
                }}
                title="More emojis"
              >
                +
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Reactions */}
      {reactionEntries.length > 0 && !isBurned && (
        <div className="message-reactions">
          {reactionEntries.map(([emoji, userIds]) => {
            const hasReacted = userIds.includes(currentUserId);
            const reactorNames = userIds.map(uid => {
              if (uid === currentUserId) return 'You';
              const u = roomUsers?.find(user => user.id === uid);
              return u ? u.name : 'Someone';
            }).join(', ');
            
            return (
              <div key={emoji} className="reaction-badge-container" style={{ position: 'relative' }}>
                <button 
                  className={`reaction-badge ${hasReacted ? 'reacted' : ''}`}
                  onClick={() => setShowReactorsFor(showReactorsFor === emoji ? null : emoji)}
                  title={reactorNames}
                >
                  {emoji} {userIds.length}
                </button>
                {showReactorsFor === emoji && (
                  <div className="reactors-tooltip">
                    {reactorNames}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <span className="message-time">{time}</span>
    </div>
  );
});
