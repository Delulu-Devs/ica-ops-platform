// Chat Router - handles real-time chat functionality

import { TRPCError } from '@trpc/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { accounts, chatMessages, chatRoomMembers } from '../db/schema';
import { coachProcedure, protectedProcedure, router } from '../trpc';

const sendMessageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1),
  messageType: z.enum(['text', 'file', 'system']).default('text'),
  fileUrl: z.string().optional(),
});

const getMessagesSchema = z.object({
  roomId: z.string().min(1),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createDMSchema = z.object({
  targetAccountId: z.uuid(),
});

export const chatRouter = router({
  getRooms: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select()
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.accountId, ctx.user.id));
    const roomIds = memberships.map((m) => m.roomId);
    if (roomIds.length === 0) return [];

    // Get last message and member count for each room
    const rooms = await Promise.all(
      roomIds.map(async (roomId: string) => {
        const lastMessageResult = await ctx.db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.roomId, roomId))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);
        const lastMessage = lastMessageResult[0] ?? null;

        const memberCountResult = await ctx.db
          .select({ memberCount: sql<number>`count(*)::int` })
          .from(chatRoomMembers)
          .where(eq(chatRoomMembers.roomId, roomId));
        const memberCount = memberCountResult[0]?.memberCount ?? 0;

        const unreadCountResult = await ctx.db
          .select({ unreadCount: sql<number>`count(*)::int` })
          .from(chatMessages)
          .where(and(eq(chatMessages.roomId, roomId), eq(chatMessages.isRead, false)));
        const unreadCount = unreadCountResult[0]?.unreadCount ?? 0;

        return { roomId, lastMessage, memberCount, unreadCount };
      })
    );

    return rooms;
  }),

  getMessages: protectedProcedure.input(getMessagesSchema).query(async ({ ctx, input }) => {
    // Verify user is member of room
    const [membership] = await ctx.db
      .select()
      .from(chatRoomMembers)
      .where(
        and(eq(chatRoomMembers.roomId, input.roomId), eq(chatRoomMembers.accountId, ctx.user.id))
      )
      .limit(1);
    if (!membership)
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Not a member of this room',
      });

    const messages = await ctx.db
      .select({
        id: chatMessages.id,
        roomId: chatMessages.roomId,
        senderId: chatMessages.senderId,
        content: chatMessages.content,
        messageType: chatMessages.messageType,
        fileUrl: chatMessages.fileUrl,
        isRead: chatMessages.isRead,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.roomId, input.roomId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return messages.reverse(); // Oldest first
  }),

  sendMessage: protectedProcedure.input(sendMessageSchema).mutation(async ({ ctx, input }) => {
    // Verify user is member of room
    const [membership] = await ctx.db
      .select()
      .from(chatRoomMembers)
      .where(
        and(eq(chatRoomMembers.roomId, input.roomId), eq(chatRoomMembers.accountId, ctx.user.id))
      )
      .limit(1);
    if (!membership)
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Not a member of this room',
      });

    const [message] = await ctx.db
      .insert(chatMessages)
      .values({
        roomId: input.roomId,
        senderId: ctx.user.id,
        content: input.content,
        messageType: input.messageType,
        fileUrl: input.fileUrl,
      })
      .returning();

    return message;
  }),

  createDM: protectedProcedure.input(createDMSchema).mutation(async ({ ctx, input }) => {
    // Verify target account exists
    const [target] = await ctx.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, input.targetAccountId))
      .limit(1);
    if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

    // Check DM permission rules (coaches and parents cannot DM each other directly)
    if (ctx.user.role === 'COACH' && target.role === 'CUSTOMER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Coaches cannot DM parents directly',
      });
    }
    if (ctx.user.role === 'CUSTOMER' && target.role === 'COACH') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Parents cannot DM coaches directly',
      });
    }

    // Create unique room ID
    const ids = [ctx.user.id, input.targetAccountId].sort();
    const roomId = `dm:${ids[0]}:${ids[1]}`;

    // Check if room already exists
    const [existing] = await ctx.db
      .select()
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.roomId, roomId))
      .limit(1);
    if (existing) return { roomId };

    // Create room memberships
    await ctx.db.insert(chatRoomMembers).values([
      { roomId, accountId: ctx.user.id, role: ctx.user.role.toLowerCase() },
      {
        roomId,
        accountId: input.targetAccountId,
        role: target.role.toLowerCase(),
      },
    ]);

    return { roomId };
  }),

  markAsRead: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify membership
      const [membership] = await ctx.db
        .select()
        .from(chatRoomMembers)
        .where(
          and(eq(chatRoomMembers.roomId, input.roomId), eq(chatRoomMembers.accountId, ctx.user.id))
        )
        .limit(1);
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member' });

      await ctx.db
        .update(chatMessages)
        .set({ isRead: true })
        .where(eq(chatMessages.roomId, input.roomId));
      return { success: true };
    }),

  uploadFile: coachProcedure
    .input(
      z.object({
        roomId: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify membership
      const [membership] = await ctx.db
        .select()
        .from(chatRoomMembers)
        .where(
          and(eq(chatRoomMembers.roomId, input.roomId), eq(chatRoomMembers.accountId, ctx.user.id))
        )
        .limit(1);
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member' });

      const [message] = await ctx.db
        .insert(chatMessages)
        .values({
          roomId: input.roomId,
          senderId: ctx.user.id,
          content: input.fileName,
          messageType: 'file',
          fileUrl: input.fileUrl,
        })
        .returning();

      return message;
    }),
});
