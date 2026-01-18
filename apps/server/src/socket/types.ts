// Socket.io event types for client-side usage
// This file can be imported by the frontend for type-safe socket communication

export interface ServerToClientEvents {
  new_message: (data: {
    id: string;
    roomId: string;
    senderId: string;
    senderEmail: string;
    content: string;
    messageType: "text" | "file" | "system";
    fileUrl?: string;
    createdAt: string;
  }) => void;
  user_typing: (data: {
    roomId: string;
    userId: string;
    email: string;
  }) => void;
  user_stopped_typing: (data: { roomId: string; userId: string }) => void;
  notification: (data: {
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) => void;
  presence_update: (data: {
    userId: string;
    status: "online" | "offline";
    lastSeen?: string;
  }) => void;
  room_joined: (data: { roomId: string; success: boolean }) => void;
  room_left: (data: { roomId: string; success: boolean }) => void;
  error: (data: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  join_room: (roomId: string) => void;
  leave_room: (roomId: string) => void;
  send_message: (data: {
    roomId: string;
    content: string;
    messageType?: "text" | "file" | "system";
    fileUrl?: string;
  }) => void;
  typing_start: (roomId: string) => void;
  typing_stop: (roomId: string) => void;
  mark_read: (roomId: string) => void;
}

// Message type for easier handling
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderEmail: string;
  content: string;
  messageType: "text" | "file" | "system";
  fileUrl?: string;
  createdAt: string;
}

// Notification type
export interface Notification {
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Presence update type
export interface PresenceUpdate {
  userId: string;
  status: "online" | "offline";
  lastSeen?: string;
}
