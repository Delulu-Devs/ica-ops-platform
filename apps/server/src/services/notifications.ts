// Notification Service - handles real-time notifications across the platform
// This service integrates with Socket.io to push notifications to users

import { getIO, sendNotificationToUser } from "../socket";

// Notification types based on user actions
export type NotificationType =
  | "demo_booked"
  | "demo_status_changed"
  | "demo_assigned"
  | "demo_reminder"
  | "student_created"
  | "student_status_changed"
  | "coach_assigned"
  | "batch_assigned"
  | "message_received"
  | "payment_received"
  | "subscription_status";

interface NotificationPayload {
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Demo-related notifications
export const demoNotifications = {
  // When a new demo is booked
  onDemoBooked: (
    adminId: string,
    demoData: { studentName: string; scheduledStart: Date },
  ) => {
    sendNotificationToUser(adminId, {
      type: "info",
      title: "New Demo Booked",
      message: `Demo scheduled for ${demoData.studentName} at ${demoData.scheduledStart.toLocaleString()}`,
      data: { event: "demo_booked", ...demoData },
    });
  },

  // When a demo is assigned to a coach
  onDemoAssigned: (
    coachId: string,
    demoData: { studentName: string; scheduledStart: Date },
  ) => {
    sendNotificationToUser(coachId, {
      type: "info",
      title: "Demo Assigned",
      message: `You have been assigned a demo with ${demoData.studentName}`,
      data: { event: "demo_assigned", ...demoData },
    });
  },

  // When demo status changes
  onDemoStatusChanged: (
    targetUserId: string,
    demoData: { studentName: string; oldStatus: string; newStatus: string },
  ) => {
    sendNotificationToUser(targetUserId, {
      type: "info",
      title: "Demo Status Updated",
      message: `Demo for ${demoData.studentName}: ${demoData.oldStatus} → ${demoData.newStatus}`,
      data: { event: "demo_status_changed", ...demoData },
    });
  },

  // When demo is converted to student
  onDemoConverted: (
    parentUserId: string,
    demoData: { studentName: string },
  ) => {
    sendNotificationToUser(parentUserId, {
      type: "success",
      title: "Welcome to ICA!",
      message: `${demoData.studentName} has been successfully enrolled. Check your dashboard for details.`,
      data: { event: "demo_converted", ...demoData },
    });
  },
};

// Student-related notifications
export const studentNotifications = {
  // When a new student is created
  onStudentCreated: (
    parentUserId: string,
    studentData: { studentName: string },
  ) => {
    sendNotificationToUser(parentUserId, {
      type: "success",
      title: "Student Enrolled",
      message: `${studentData.studentName} has been enrolled successfully`,
      data: { event: "student_created", ...studentData },
    });
  },

  // When a coach is assigned to student
  onCoachAssigned: (
    parentUserId: string,
    data: { studentName: string; coachName: string },
  ) => {
    sendNotificationToUser(parentUserId, {
      type: "info",
      title: "Coach Assigned",
      message: `${data.coachName} has been assigned as ${data.studentName}'s coach`,
      data: { event: "coach_assigned", ...data },
    });
  },

  // When assigned to a batch
  onBatchAssigned: (
    parentUserId: string,
    data: { studentName: string; batchName: string },
  ) => {
    sendNotificationToUser(parentUserId, {
      type: "info",
      title: "Batch Assigned",
      message: `${data.studentName} has been added to ${data.batchName}`,
      data: { event: "batch_assigned", ...data },
    });
  },

  // When student status changes
  onStatusChanged: (
    parentUserId: string,
    data: { studentName: string; oldStatus: string; newStatus: string },
  ) => {
    const notificationType =
      data.newStatus === "CANCELLED" ? "warning" : "info";
    sendNotificationToUser(parentUserId, {
      type: notificationType,
      title: "Student Status Changed",
      message: `${data.studentName}'s status: ${data.oldStatus} → ${data.newStatus}`,
      data: { event: "student_status_changed", ...data },
    });
  },
};

// Coach-related notifications
export const coachNotifications = {
  // When assigned a new student
  onStudentAssigned: (
    coachId: string,
    data: { studentName: string; studentType: string },
  ) => {
    sendNotificationToUser(coachId, {
      type: "info",
      title: "New Student Assigned",
      message: `${data.studentName} (${data.studentType}) has been assigned to you`,
      data: { event: "student_assigned", ...data },
    });
  },

  // When assigned to a batch
  onBatchAssigned: (
    coachId: string,
    data: { batchName: string; studentCount: number },
  ) => {
    sendNotificationToUser(coachId, {
      type: "info",
      title: "Batch Updated",
      message: `You have been assigned to ${data.batchName} with ${data.studentCount} students`,
      data: { event: "batch_assigned_coach", ...data },
    });
  },
};

// Subscription notifications
export const subscriptionNotifications = {
  // When subscription is created
  onSubscriptionCreated: (
    userId: string,
    data: { planName: string; amount: number },
  ) => {
    sendNotificationToUser(userId, {
      type: "success",
      title: "Subscription Active",
      message: `Your ${data.planName} subscription is now active`,
      data: { event: "subscription_created", ...data },
    });
  },

  // When subscription status changes
  onStatusChanged: (
    userId: string,
    data: { planName: string; oldStatus: string; newStatus: string },
  ) => {
    const notificationType =
      data.newStatus === "SUSPENDED" || data.newStatus === "CANCELLED"
        ? "warning"
        : "info";
    sendNotificationToUser(userId, {
      type: notificationType,
      title: "Subscription Status",
      message: `Your ${data.planName} subscription: ${data.newStatus}`,
      data: { event: "subscription_status", ...data },
    });
  },

  // Payment reminder
  onPaymentDue: (
    userId: string,
    data: { planName: string; dueDate: Date; amount: number },
  ) => {
    sendNotificationToUser(userId, {
      type: "warning",
      title: "Payment Due",
      message: `Payment of ₹${data.amount} for ${data.planName} is due on ${data.dueDate.toLocaleDateString()}`,
      data: { event: "payment_due", ...data },
    });
  },
};

// Chat notifications
export const chatNotifications = {
  // New message in a room (for users not currently in the room)
  onNewMessage: (
    userId: string,
    data: { roomId: string; senderName: string; preview: string },
  ) => {
    sendNotificationToUser(userId, {
      type: "info",
      title: `Message from ${data.senderName}`,
      message:
        data.preview.substring(0, 100) +
        (data.preview.length > 100 ? "..." : ""),
      data: { event: "new_message", roomId: data.roomId },
    });
  },
};

// Broadcast notification to multiple users
export function broadcastNotification(
  userIds: string[],
  notification: NotificationPayload,
): void {
  for (const userId of userIds) {
    sendNotificationToUser(userId, notification);
  }
}

// Broadcast to a room (all members)
export function broadcastToRoom(
  roomId: string,
  notification: NotificationPayload,
): void {
  const io = getIO();
  if (io) {
    io.to(roomId).emit("notification", notification);
  }
}

// System-wide broadcast (use sparingly)
export function systemBroadcast(notification: NotificationPayload): void {
  const io = getIO();
  if (io) {
    io.emit("notification", notification);
  }
}
