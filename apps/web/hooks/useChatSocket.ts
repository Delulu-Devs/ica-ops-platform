// React hook for Socket.io chat functionality
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ChatMessage,
  connectSocket,
  disconnectSocket,
  emitTyping,
  getSocket,
  joinRoom,
  leaveRoom,
  onNewMessage,
  onTyping,
  type TypingEvent,
} from '@/lib/socket';
import { useAuthStore } from '@/store/useAuthStore';

interface UseChatSocketOptions {
  roomId: string | null;
  onMessage?: (message: ChatMessage) => void;
  onTypingChange?: (event: TypingEvent) => void;
  onPresenceChange?: (event: { userId: string; status: 'online' | 'offline' }) => void;
}

export function useChatSocket({
  roomId,
  onMessage,
  onTypingChange,
  onPresenceChange,
}: UseChatSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const previousRoomRef = useRef<string | null>(null);

  // Get access token from auth store
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  // Connect socket on mount
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [accessToken]);

  // Join/leave rooms when roomId changes
  useEffect(() => {
    if (!isConnected) return;

    // Leave previous room
    if (previousRoomRef.current && previousRoomRef.current !== roomId) {
      leaveRoom(previousRoomRef.current);
    }

    // Join new room
    if (roomId) {
      joinRoom(roomId);
      previousRoomRef.current = roomId;
    }

    // Cleanup: leave room on unmount
    return () => {
      if (roomId) {
        leaveRoom(roomId);
      }
    };
  }, [roomId, isConnected]);

  // Subscribe to new messages
  useEffect(() => {
    if (!roomId || !onMessage) return;

    const unsubscribe = onNewMessage((message) => {
      // Only process messages for current room
      if (message.roomId === roomId) {
        onMessage(message);
      }
    });

    return unsubscribe;
  }, [roomId, onMessage]);

  // Subscribe to typing events
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onTyping((event) => {
      if (event.roomId !== roomId) return;

      setTypingUsers((prev) => {
        if (event.isTyping) {
          return prev.includes(event.userId) ? prev : [...prev, event.userId];
        } else {
          return prev.filter((id) => id !== event.userId);
        }
      });

      if (onTypingChange) {
        onTypingChange(event);
      }
    });

    return unsubscribe;
  }, [roomId, onTypingChange]);

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (roomId) {
        emitTyping(roomId, isTyping);
      }
    },
    [roomId]
  );

  // Subscribe to presence updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePresenceUpdate = (data: { userId: string; status: 'online' | 'offline' }) => {
      if (onPresenceChange) {
        onPresenceChange(data);
      }
    };

    socket.on('presence_update', handlePresenceUpdate);

    return () => {
      socket.off('presence_update', handlePresenceUpdate);
    };
  }, [onPresenceChange]);

  return {
    isConnected,
    typingUsers,
    sendTyping,
  };
}

// Hook for socket connection lifecycle management
export function useSocketConnection() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        connectSocket(token);
      }
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);
}
