// Coach Router - handles coach profile and schedule management

import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { accounts, batches, coaches, demos, students } from '../db/schema';
import { adminProcedure, coachProcedure, protectedProcedure, router } from '../trpc';

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
});

const listCoachesSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const coachRouter = router({
  list: adminProcedure.input(listCoachesSchema).query(async ({ ctx, input }) => {
    const countResult = await ctx.db.select({ count: sql<number>`count(*)::int` }).from(coaches);
    const count = countResult[0]?.count ?? 0;
    const coachList = await ctx.db
      .select()
      .from(coaches)
      .orderBy(desc(coaches.createdAt))
      .limit(input.limit)
      .offset(input.offset);
    return { coaches: coachList, total: count };
  }),

  getById: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [coach] = await ctx.db.select().from(coaches).where(eq(coaches.id, input.id)).limit(1);
    if (!coach) throw new TRPCError({ code: 'NOT_FOUND', message: 'Coach not found' });
    if (ctx.user.role !== 'ADMIN' && coach.accountId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
    }
    const studentCountResult = await ctx.db
      .select({ studentCount: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.assignedCoachId, coach.id));
    const studentCount = studentCountResult[0]?.studentCount ?? 0;
    return { ...coach, studentCount };
  }),

  getProfile: coachProcedure.query(async ({ ctx }) => {
    const [coach] = await ctx.db
      .select()
      .from(coaches)
      .where(eq(coaches.accountId, ctx.user.id))
      .limit(1);
    if (!coach)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Coach profile not found',
      });
    const studentCountResult = await ctx.db
      .select({ studentCount: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.assignedCoachId, coach.id));
    const studentCount = studentCountResult[0]?.studentCount ?? 0;
    const batchCountResult = await ctx.db
      .select({ batchCount: sql<number>`count(*)::int` })
      .from(batches)
      .where(eq(batches.coachId, coach.id));
    const batchCount = batchCountResult[0]?.batchCount ?? 0;
    return { ...coach, studentCount, batchCount };
  }),

  updateProfile: coachProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
    const [coach] = await ctx.db
      .select({ id: coaches.id })
      .from(coaches)
      .where(eq(coaches.accountId, ctx.user.id))
      .limit(1);
    if (!coach)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Coach profile not found',
      });
    const [updated] = await ctx.db
      .update(coaches)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(coaches.id, coach.id))
      .returning();
    return updated;
  }),

  updateAvailability: coachProcedure
    .input(z.object({ availability: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);
      if (!coach)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Coach profile not found',
        });
      try {
        JSON.parse(input.availability);
      } catch {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid JSON' });
      }
      const [updated] = await ctx.db
        .update(coaches)
        .set({ availability: input.availability, updatedAt: new Date() })
        .where(eq(coaches.id, coach.id))
        .returning();
      return updated;
    }),

  getSchedule: coachProcedure
    .input(
      z.object({
        startDate: z.iso.datetime(),
        endDate: z.iso.datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);
      if (!coach) throw new TRPCError({ code: 'NOT_FOUND', message: 'Coach not found' });
      const demoList = await ctx.db
        .select()
        .from(demos)
        .where(
          and(
            eq(demos.coachId, coach.id),
            gte(demos.scheduledStart, new Date(input.startDate)),
            lte(demos.scheduledStart, new Date(input.endDate))
          )
        )
        .orderBy(demos.scheduledStart);
      const batchList = await ctx.db.select().from(batches).where(eq(batches.coachId, coach.id));
      return { demos: demoList, batches: batchList };
    }),

  blockTime: coachProcedure
    .input(
      z.object({
        startTime: z.iso.datetime(),
        endTime: z.iso.datetime(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [coach] = await ctx.db
        .select({ id: coaches.id, availability: coaches.availability })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);
      if (!coach) throw new TRPCError({ code: 'NOT_FOUND', message: 'Coach not found' });
      let avail: {
        blockedTimes?: Array<{ start: string; end: string; reason?: string }>;
      } = {};
      try {
        if (coach.availability) avail = JSON.parse(coach.availability);
      } catch {
        avail = {};
      }
      if (!avail.blockedTimes) avail.blockedTimes = [];
      avail.blockedTimes.push({
        start: input.startTime,
        end: input.endTime,
        reason: input.reason,
      });
      const [updated] = await ctx.db
        .update(coaches)
        .set({ availability: JSON.stringify(avail), updatedAt: new Date() })
        .where(eq(coaches.id, coach.id))
        .returning();
      return updated;
    }),

  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        bio: z.string().optional(),
        rating: z.number().optional(),
        specializations: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(coaches)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(coaches.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Coach not found' });
      }
      return updated;
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // First find the coach to get the accountId
    const [coach] = await ctx.db
      .select({ accountId: coaches.accountId })
      .from(coaches)
      .where(eq(coaches.id, input.id))
      .limit(1);

    if (!coach) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Coach not found' });
    }

    // Delete the account (will cascade delete coach profile due to foreign key constraints)
    // If we only delete the coach profile, the login account remains
    await ctx.db.delete(accounts).where(eq(accounts.id, coach.accountId));

    return { success: true };
  }),
});
