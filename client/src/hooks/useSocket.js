import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { importSecureKey, encryptMessage, decryptMessage } from '../utils/crypto';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://YOUR_RENDER_URL_HERE');

export function useSocket(secretKeyHash = '') {
  const cryptoKeyRef = useRef(null);
  const [isSecure, setIsSecure] = useState(false);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [room, setRoom] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (secretKeyHash) {
      importSecureKey(secretKeyHash).then(key => {
        if (key) {
          cryptoKeyRef.current = key;
          setIsSecure(true);
        }
      });
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new-message', async (msg) => {
      let finalMsg = { ...msg };
      if (finalMsg.isEncrypted) {
        if (cryptoKeyRef.current) {
          if (finalMsg.text) {
            const dec = await decryptMessage(finalMsg.text, cryptoKeyRef.current);
            finalMsg.text = dec || '🔒 [Encrypted Message]';
          }
          if (finalMsg.fileData) {
            const dec = await decryptMessage(finalMsg.fileData, cryptoKeyRef.current);
            finalMsg.fileData = dec; // if null, image will break, which is correct for failed decryption
          }
        } else {
          finalMsg.text = '🔒 [Encrypted Message]';
          if (finalMsg.fileData) finalMsg.fileData = null;
        }
      }
      setMessages((prev) => [...prev, finalMsg]);
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

    socket.on('reaction-updated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, reactions } : msg
        )
      );
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
      socketRef.current.emit('join-room', { code, userName }, async (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          setRoom(response.room);
          
          // Decrypt previous messages
          const decryptedMessages = [];
          for (let msg of (response.messages || [])) {
            let finalMsg = { ...msg };
            if (finalMsg.isEncrypted) {
              if (cryptoKeyRef.current) {
                if (finalMsg.text) {
                  const dec = await decryptMessage(finalMsg.text, cryptoKeyRef.current);
                  finalMsg.text = dec || '🔒 [Encrypted Message]';
                }
                if (finalMsg.fileData) {
                  const dec = await decryptMessage(finalMsg.fileData, cryptoKeyRef.current);
                  finalMsg.fileData = dec;
                }
              } else {
                finalMsg.text = '🔒 [Encrypted Message]';
                if (finalMsg.fileData) finalMsg.fileData = null;
              }
            }
            decryptedMessages.push(finalMsg);
          }
          
          setMessages(decryptedMessages);
          setUsers(response.users || []);
          setIsExpired(false);
          resolve(response);
        }
      });
    });
  }, []);

  const sendMessage = useCallback(async (text, isGhost = false) => {
    if (!socketRef.current || !text.trim()) return;
    
    let payloadText = text.trim();
    let isEncrypted = false;
    if (cryptoKeyRef.current) {
      payloadText = await encryptMessage(payloadText, cryptoKeyRef.current);
      isEncrypted = true;
    }
    
    socketRef.current.emit('send-message', { text: payloadText, isGhost, isEncrypted });
  }, []);

  const sendTyping = useCallback((isTyping) => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { isTyping });
  }, []);

  const sendFile = useCallback(async (fileData, fileName, fileType, isGhost) => {
    if (!socketRef.current) return;
    
    let payloadFile = fileData;
    let isEncrypted = false;
    if (cryptoKeyRef.current) {
      payloadFile = await encryptMessage(fileData, cryptoKeyRef.current);
      isEncrypted = true;
    }
    
    socketRef.current.emit('send-message', {
      text: '',
      fileData: payloadFile,
      fileName,
      fileType,
      isEncrypted,
      isGhost
    });
  }, []);

  const addReaction = useCallback((messageId, emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit('add-reaction', { messageId, emoji });
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
    isSecure,
    joinRoom,
    sendMessage,
    sendFile,
    sendTyping,
    addReaction,
  };
}
