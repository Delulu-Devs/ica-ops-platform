// Socket.io client for real-time communication
import { io, Socket } from 'socket.io-client';

// Socket.io server URL
const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

// Singleton socket instance
let socket: Socket | null = null;

// Get or create socket connection
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 Socket.io connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.io disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket.io connection error:', error.message);
    });
  }

  return socket;
}

// Connect socket with authentication
export function connectSocket(accessToken: string): Socket {
  const sock = getSocket();

  // Add auth token to socket
  sock.auth = { token: accessToken };

  if (!sock.connected) {
    sock.connect();
  }

  return sock;
}

// Disconnect socket
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Join a chat room
export function joinRoom(roomId: string): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit('join_room', roomId);
    console.log('📝 Joined room:', roomId);
  }
}

// Leave a chat room
export function leaveRoom(roomId: string): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit('leave_room', roomId);
    console.log('📝 Left room:', roomId);
  }
}

// Send a message to a room
export function sendSocketMessage(roomId: string, content: string): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit('send_message', { roomId, content });
  }
}

// Types for socket events
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: string;
}

export interface TypingEvent {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

// Event listener types
export type MessageHandler = (message: ChatMessage) => void;
export type TypingHandler = (event: TypingEvent) => void;

// Subscribe to new messages
export function onNewMessage(handler: MessageHandler): () => void {
  const sock = getSocket();
  sock.on('new_message', handler);
  return () => sock.off('new_message', handler);
}

// Subscribe to typing events
export function onTyping(handler: TypingHandler): () => void {
  const sock = getSocket();
  sock.on('typing', handler);
  return () => sock.off('typing', handler);
}

// Emit typing event
export function emitTyping(roomId: string, isTyping: boolean): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit('typing', { roomId, isTyping });
  }
}
