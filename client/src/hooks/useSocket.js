import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://YOUR_RENDER_URL_HERE');

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [room, setRoom] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('users-update', (userList) => {
      setUsers(userList);
    });

    socket.on('user-typing', ({ userId, userName, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.find((u) => u.userId === userId)) return prev;
          return [...prev, { userId, userName }];
        }
        return prev.filter((u) => u.userId !== userId);
      });
    });

    socket.on('room-expired', () => {
      setIsExpired(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((code, userName) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Not connected'));
      socketRef.current.emit('join-room', { code, userName }, (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          setRoom(response.room);
          setMessages(response.messages || []);
          setUsers(response.users || []);
          setIsExpired(false);
          resolve(response);
        }
      });
    });
  }, []);

  const sendMessage = useCallback((text) => {
    if (!socketRef.current || !text.trim()) return;
    socketRef.current.emit('send-message', { text: text.trim() });
  }, []);

  const sendTyping = useCallback((isTyping) => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { isTyping });
  }, []);

  const socketId = socketRef.current?.id || null;

  return {
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
  };
}
