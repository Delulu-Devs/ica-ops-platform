// Batch Router - handles batch management

import { TRPCError } from '@trpc/server';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { batches, coaches, students } from '../db/schema';
import { adminProcedure, coachProcedure, protectedProcedure, router } from '../trpc';

const createBatchSchema = z.object({
  name: z.string().min(2, { error: 'Batch name is required' }),
  coachId: z.uuid({ error: 'Invalid coach ID' }),
  level: z.string().optional(),
  timezone: z.string().optional(),
  schedule: z.string().optional(), // JSON string for schedule
  maxStudents: z.number().min(1).max(50).default(10),
});

const updateBatchSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2).optional(),
  level: z.string().optional(),
  timezone: z.string().optional(),
  schedule: z.string().optional(),
  maxStudents: z.number().min(1).max(50).optional(),
});

const listBatchesSchema = z.object({
  coachId: z.uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const batchRouter = router({
  list: coachProcedure.input(listBatchesSchema).query(async ({ ctx, input }) => {
    const conditions = [];

    if (ctx.user.role === 'COACH') {
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);
      if (!coach) return { batches: [], total: 0 };
      conditions.push(eq(batches.coachId, coach.id));
    } else if (input.coachId) {
      conditions.push(eq(batches.coachId, input.coachId));
    }

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;
    const countResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(batches)
      .where(whereClause);
    const count = countResult[0]?.count ?? 0;
    const batchList = await ctx.db
      .select()
      .from(batches)
      .where(whereClause)
      .orderBy(desc(batches.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return { batches: batchList, total: count };
  }),

  getById: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [batch] = await ctx.db.select().from(batches).where(eq(batches.id, input.id)).limit(1);
    if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

    // Get student count
    const studentCountResult = await ctx.db
      .select({ studentCount: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.assignedBatchId, batch.id));
    const studentCount = studentCountResult[0]?.studentCount ?? 0;

    // Get coach info
    const coachResult = await ctx.db
      .select({ id: coaches.id, name: coaches.name })
      .from(coaches)
      .where(eq(coaches.id, batch.coachId))
      .limit(1);
    const coach = coachResult[0] ?? null;

    return { ...batch, studentCount, coach };
  }),

  create: adminProcedure.input(createBatchSchema).mutation(async ({ ctx, input }) => {
    const [coach] = await ctx.db
      .select({ id: coaches.id })
      .from(coaches)
      .where(eq(coaches.id, input.coachId))
      .limit(1);
    if (!coach) throw new TRPCError({ code: 'NOT_FOUND', message: 'Coach not found' });

    const [batch] = await ctx.db
      .insert(batches)
      .values({
        name: input.name,
        coachId: input.coachId,
        level: input.level,
        timezone: input.timezone,
        schedule: input.schedule,
        maxStudents: input.maxStudents,
      })
      .returning();

    return batch;
  }),

  update: adminProcedure.input(updateBatchSchema).mutation(async ({ ctx, input }) => {
    const [batch] = await ctx.db
      .select({ id: batches.id })
      .from(batches)
      .where(eq(batches.id, input.id))
      .limit(1);
    if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

    const { id, ...updateData } = input;
    const [updated] = await ctx.db
      .update(batches)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(batches.id, id))
      .returning();
    return updated;
  }),

  reassignCoach: adminProcedure
    .input(z.object({ id: z.uuid(), coachId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [batch] = await ctx.db
        .select({ id: batches.id })
        .from(batches)
        .where(eq(batches.id, input.id))
        .limit(1);
      if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.id, input.coachId))
        .limit(1);
      if (!coach) throw new TRPCError({ code: 'NOT_FOUND', message: 'Coach not found' });

      // Update batch coach
      const [updated] = await ctx.db
        .update(batches)
        .set({ coachId: input.coachId, updatedAt: new Date() })
        .where(eq(batches.id, input.id))
        .returning();

      // Update all students in this batch to the new coach
      await ctx.db
        .update(students)
        .set({ assignedCoachId: input.coachId, updatedAt: new Date() })
        .where(eq(students.assignedBatchId, input.id));

      return updated;
    }),
});
