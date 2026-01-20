// Socket.io server setup for real-time features
import { Server } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { getRedis } from '../lib/redis';

// Types for socket events
interface ServerToClientEvents {
  new_message: (data: {
    id: string;
    roomId: string;
    senderId: string;
    senderEmail: string;
    content: string;
    messageType: 'text' | 'file' | 'system';
    fileUrl?: string;
    createdAt: string;
  }) => void;
  user_typing: (data: { roomId: string; userId: string; email: string }) => void;
  user_stopped_typing: (data: { roomId: string; userId: string }) => void;
  notification: (data: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) => void;
  presence_update: (data: {
    userId: string;
    status: 'online' | 'offline';
    lastSeen?: string;
  }) => void;
  room_joined: (data: { roomId: string; success: boolean }) => void;
  room_left: (data: { roomId: string; success: boolean }) => void;
  error: (data: { message: string; code?: string }) => void;
}

interface ClientToServerEvents {
  join_room: (roomId: string) => void;
  leave_room: (roomId: string) => void;
  send_message: (data: {
    roomId: string;
    content: string;
    messageType?: 'text' | 'file' | 'system';
    fileUrl?: string;
  }) => void;
  typing_start: (roomId: string) => void;
  typing_stop: (roomId: string) => void;
  mark_read: (roomId: string) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: string;
  email: string;
  role: 'ADMIN' | 'COACH' | 'CUSTOMER';
}

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: TypedServer | null = null;

// Initialize Socket.io server
// biome-ignore lint/suspicious/noExplicitAny: Server types vary between http and http2
export function initSocketServer(httpServer: any): TypedServer {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000'
  ).split(',');

  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    }
  );

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = await verifyAccessToken(token);
      if (!payload) {
        return next(new Error('Invalid or expired token'));
      }

      // Attach user data to socket
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      socket.data.role = payload.role;

      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', async (socket) => {
    const { userId, email, role } = socket.data;
    console.log(`🔌 Socket connected: ${email} (${role})`);

    // Track user presence in Redis
    await setUserOnline(userId);

    // Broadcast presence to interested parties
    socket.broadcast.emit('presence_update', {
      userId,
      status: 'online',
    });

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Handle joining a chat room
    socket.on('join_room', async (roomId) => {
      try {
        // Validate room access (simplified - in production, check membership in DB)
        socket.join(roomId);

        // Track room membership in Redis for presence
        await addUserToRoom(roomId, userId);

        socket.emit('room_joined', { roomId, success: true });
        console.log(`📥 ${email} joined room: ${roomId}`);
      } catch {
        socket.emit('error', {
          message: 'Failed to join room',
          code: 'JOIN_FAILED',
        });
      }
    });

    // Handle leaving a chat room
    socket.on('leave_room', async (roomId) => {
      try {
        socket.leave(roomId);
        await removeUserFromRoom(roomId, userId);

        socket.emit('room_left', { roomId, success: true });
        console.log(`📤 ${email} left room: ${roomId}`);
      } catch {
        socket.emit('error', {
          message: 'Failed to leave room',
          code: 'LEAVE_FAILED',
        });
      }
    });

    // Handle sending a message (real-time broadcast)
    // Note: Message persistence is handled by tRPC, this is just for real-time delivery
    socket.on('send_message', async (data) => {
      try {
        const message = {
          id: crypto.randomUUID(),
          roomId: data.roomId,
          senderId: userId,
          senderEmail: email,
          content: data.content,
          messageType: data.messageType || 'text',
          fileUrl: data.fileUrl,
          createdAt: new Date().toISOString(),
        };

        // Broadcast to all users in the room (including sender for confirmation)
        io?.to(data.roomId).emit('new_message', message);

        console.log(`💬 Message in ${data.roomId} from ${email}`);
      } catch {
        socket.emit('error', {
          message: 'Failed to send message',
          code: 'SEND_FAILED',
        });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (roomId) => {
      socket.to(roomId).emit('user_typing', { roomId, userId, email });
    });

    socket.on('typing_stop', (roomId) => {
      socket.to(roomId).emit('user_stopped_typing', { roomId, userId });
    });

    // Handle mark as read (can trigger notification to sender)
    socket.on('mark_read', async (roomId) => {
      // This could update Redis or trigger a notification
      console.log(`👁️ ${email} marked ${roomId} as read`);
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 Socket disconnected: ${email} (${reason})`);

      // Update presence
      await setUserOffline(userId);

      // Broadcast offline status
      socket.broadcast.emit('presence_update', {
        userId,
        status: 'offline',
        lastSeen: new Date().toISOString(),
      });
    });
  });

  console.log('🔌 Socket.io server initialized');
  return io;
}

// Get the Socket.io server instance
export function getIO(): TypedServer | null {
  return io;
}

// Helper function to send notification to specific user
export function sendNotificationToUser(
  userId: string,
  notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }
): void {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
}

// Helper function to broadcast message to a room
export function broadcastToRoom(
  roomId: string,
  event: keyof ServerToClientEvents,
  data: unknown
): void {
  if (io) {
    // @ts-expect-error - dynamic event emission
    io.to(roomId).emit(event, data);
  }
}

// Redis helpers for presence tracking
const PRESENCE_PREFIX = 'presence:';
const ROOM_MEMBERS_PREFIX = 'room_members:';
const PRESENCE_TTL = 300; // 5 minutes

async function setUserOnline(userId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`${PRESENCE_PREFIX}${userId}`, 'online', {
      EX: PRESENCE_TTL,
    });
  } catch (error) {
    console.error('Failed to set user online:', error);
  }
}

async function setUserOffline(userId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(`${PRESENCE_PREFIX}${userId}`, new Date().toISOString(), {
      EX: PRESENCE_TTL,
    });
  } catch (error) {
    console.error('Failed to set user offline:', error);
  }
}

async function addUserToRoom(roomId: string, userId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.sAdd(`${ROOM_MEMBERS_PREFIX}${roomId}`, userId);
  } catch (error) {
    console.error('Failed to add user to room:', error);
  }
}

async function removeUserFromRoom(roomId: string, userId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.sRem(`${ROOM_MEMBERS_PREFIX}${roomId}`, userId);
  } catch (error) {
    console.error('Failed to remove user from room:', error);
  }
}

// Get online users in a room
export async function getRoomOnlineUsers(roomId: string): Promise<string[]> {
  try {
    const redis = await getRedis();
    const members = await redis.sMembers(`${ROOM_MEMBERS_PREFIX}${roomId}`);
    const onlineUsers: string[] = [];

    for (const userId of members) {
      const status = await redis.get(`${PRESENCE_PREFIX}${userId}`);
      if (status === 'online') {
        onlineUsers.push(userId);
      }
    }

    return onlineUsers;
  } catch (error) {
    console.error('Failed to get room online users:', error);
    return [];
  }
}

// Check if a specific user is online
export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    const status = await redis.get(`${PRESENCE_PREFIX}${userId}`);
    return status === 'online';
  } catch (error) {
    console.error('Failed to check user online status:', error);
    return false;
  }
}
