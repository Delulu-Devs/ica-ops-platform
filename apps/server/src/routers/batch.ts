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
      // If admin wants to filter by coach
      conditions.push(eq(batches.coachId, input.coachId));
    }
    // If Admin and no coachId, conditions is empty -> fetch all

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;

    // ... rest of the query ...
    const countResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(batches)
      .where(whereClause);
    const count = countResult[0]?.count ?? 0;

    // Join with coaches to get coach name for the list view
    const batchList = await ctx.db
      .select({
        id: batches.id,
        name: batches.name,
        coachId: batches.coachId,
        level: batches.level,
        timezone: batches.timezone,
        schedule: batches.schedule,
        maxStudents: batches.maxStudents,
        createdAt: batches.createdAt,
        updatedAt: batches.updatedAt,
        coachName: coaches.name,
      })
      .from(batches)
      .leftJoin(coaches, eq(batches.coachId, coaches.id))
      .where(whereClause)
      .orderBy(desc(batches.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return { batches: batchList, total: count };
  }),

  getById: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    // ... existing implementation ...
    const [batch] = await ctx.db.select().from(batches).where(eq(batches.id, input.id)).limit(1);
    if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

    // Authorization: Coach can only view their own batches
    if (ctx.user.role === 'COACH') {
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);
      if (!coach || batch.coachId !== coach.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You usually cannot view other batches.',
        });
        // Actually, strict RBAC says coaches view assigned only.
      }
    }

    const studentCountResult = await ctx.db
      .select({ studentCount: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.assignedBatchId, batch.id));
    const studentCount = studentCountResult[0]?.studentCount ?? 0;

    const coachResult = await ctx.db
      .select({ id: coaches.id, name: coaches.name })
      .from(coaches)
      .where(eq(coaches.id, batch.coachId))
      .limit(1);
    const coach = coachResult[0] ?? null;

    return { ...batch, studentCount, coach };
  }),

  // Get students in a batch (Coach/Admin)
  getStudents: protectedProcedure
    .input(z.object({ batchId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [batch] = await ctx.db
        .select()
        .from(batches)
        .where(eq(batches.id, input.batchId))
        .limit(1);
      if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

      // RBAC
      if (ctx.user.role === 'COACH') {
        const [coach] = await ctx.db
          .select({ id: coaches.id })
          .from(coaches)
          .where(eq(coaches.accountId, ctx.user.id))
          .limit(1);
        if (!coach || batch.coachId !== coach.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      } else if (ctx.user.role === 'CUSTOMER') {
        const [student] = await ctx.db
          .select()
          .from(students)
          .where(eq(students.accountId, ctx.user.id))
          .limit(1);
        if (!student || student.assignedBatchId !== input.batchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
      }

      const batchStudents = await ctx.db
        .select()
        .from(students)
        .where(eq(students.assignedBatchId, input.batchId))
        .orderBy(students.studentName);

      return batchStudents;
    }),

  // ... create, update ...
  create: adminProcedure.input(createBatchSchema).mutation(async ({ ctx, input }) => {
    // ... existing create ...
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
        schedule: input.schedule, // Validated as string, UI ensures correct format
        maxStudents: input.maxStudents,
      })
      .returning();

    return batch;
  }),

  update: adminProcedure.input(updateBatchSchema).mutation(async ({ ctx, input }) => {
    // ... existing update ...
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

  // Delete batch (Admin only)
  delete: adminProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [batch] = await ctx.db.select().from(batches).where(eq(batches.id, input.id)).limit(1);
    if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

    // Check if batch has students
    const [studentCount] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.assignedBatchId, input.id));

    if (studentCount && studentCount.count > 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `Cannot delete batch with ${studentCount.count} active students. Reassign them first.`,
      });
    }

    await ctx.db.delete(batches).where(eq(batches.id, input.id));
    return { success: true };
  }),

  reassignCoach: adminProcedure
    .input(z.object({ id: z.uuid(), coachId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      // ... existing reassignCoach ...
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

      const [updated] = await ctx.db
        .update(batches)
        .set({ coachId: input.coachId, updatedAt: new Date() })
        .where(eq(batches.id, input.id))
        .returning();

      await ctx.db
        .update(students)
        .set({ assignedCoachId: input.coachId, updatedAt: new Date() })
        .where(eq(students.assignedBatchId, input.id));

      return updated;
    }),
});
