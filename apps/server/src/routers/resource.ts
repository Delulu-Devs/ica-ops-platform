import { TRPCError } from '@trpc/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { batches, coaches, resources, students } from '../db/schema';
import { coachProcedure, protectedProcedure, router } from '../trpc';

const createResourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.enum(['pdf', 'pgn', 'image', 'video', 'other']), // Basic validation in generic string
  batchId: z.uuid().optional(), // If not provided, it's a general resource for the coach
});

const listResourcesSchema = z.object({
  batchId: z.uuid().optional(), // Filter by batch
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

export const resourceRouter = router({
  // Upload/Create resource record
  create: coachProcedure.input(createResourceSchema).mutation(async ({ ctx, input }) => {
    // Get coach ID
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

    // Verify batch ownership if batchId provided
    if (input.batchId) {
      const [batch] = await ctx.db
        .select()
        .from(batches)
        .where(and(eq(batches.id, input.batchId), eq(batches.coachId, coach.id)))
        .limit(1);

      if (!batch)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this batch',
        });
    }

    const [resource] = await ctx.db
      .insert(resources)
      .values({
        title: input.title,
        description: input.description,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        coachId: coach.id,
        batchId: input.batchId,
      })
      .returning();

    return resource;
  }),

  // List resources (Coach views own, Student views batch assigned)
  list: protectedProcedure.input(listResourcesSchema).query(async ({ ctx, input }) => {
    const conditions = [];

    if (ctx.user.role === 'COACH') {
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);

      if (!coach) return { resources: [], total: 0 };

      conditions.push(eq(resources.coachId, coach.id));
      if (input.batchId) {
        conditions.push(eq(resources.batchId, input.batchId));
      }
    } else if (ctx.user.role === 'CUSTOMER') {
      // Get student's assigned batch
      const [student] = await ctx.db
        .select({ assignedBatchId: students.assignedBatchId })
        .from(students)
        .where(eq(students.accountId, ctx.user.id))
        .limit(1);

      if (!student || !student.assignedBatchId) {
        return { resources: [], total: 0 };
      }

      // If specific batch requested, must match assigned
      if (input.batchId && input.batchId !== student.assignedBatchId) {
        return { resources: [], total: 0 };
      }

      conditions.push(eq(resources.batchId, student.assignedBatchId));
    }

    // Default fetch for Coach
    const resourceList = await ctx.db
      .select()
      .from(resources)
      .where(and(...conditions))
      .orderBy(desc(resources.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return { resources: resourceList, total: resourceList.length };
  }),

  // Delete resource
  delete: coachProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    // Check ownership
    const [coach] = await ctx.db
      .select({ id: coaches.id })
      .from(coaches)
      .where(eq(coaches.accountId, ctx.user.id))
      .limit(1);

    const [resource] = await ctx.db
      .select()
      .from(resources)
      .where(and(eq(resources.id, input.id), eq(resources.coachId, coach!.id))) // coach exists if pass coachProcedure
      .limit(1);

    if (!resource)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });

    await ctx.db.delete(resources).where(eq(resources.id, input.id));
    return { success: true };
  }),
});
