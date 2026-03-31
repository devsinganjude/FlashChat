import React from 'react';

const AVATAR_COLORS = [
  '#a855f7', '#06b6d4', '#3b82f6', '#22c55e',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
  '#14b8a6', '#f97316',
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name) {
  return name.charAt(0).toUpperCase();
}

export default function UserList({ users, currentUserId }) {
  return (
    <div className="chat-sidebar-users">
      <h3>Online — {users.length}</h3>
      {users.map((user) => (
        <div className="user-list-item" key={user.id}>
          <div
            className="user-avatar"
            style={{ background: getColor(user.name) }}
          >
            {getInitial(user.name)}
          </div>
          <span className="user-name">
            {user.name}
            {user.id === currentUserId && (
              <span className="user-you">(you)</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
