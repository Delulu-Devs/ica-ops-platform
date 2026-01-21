// Student Router - handles student management

import { TRPCError } from '@trpc/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { accounts, batches, coaches, reviewRequests, students } from '../db/schema';
import { coachNotifications, studentNotifications } from '../services/notifications';
import { adminProcedure, protectedProcedure, router } from '../trpc';

// Input validation schemas
const createStudentSchema = z.object({
  accountId: z.uuid({ error: 'Invalid account ID' }),
  studentName: z.string().min(2, { error: 'Student name is required' }),
  studentAge: z.number().min(4).max(100).optional(),
  parentName: z.string().min(2, { error: 'Parent name is required' }),
  parentEmail: z.email({ error: 'Valid email is required' }),
  timezone: z.string().optional(),
  country: z.string().optional(),
  studentType: z.enum(['1-1', 'GROUP']),
  level: z.string().optional(),
  chessUsernames: z.string().optional(), // JSON string
  rating: z.number().optional(),
  assignedCoachId: z.uuid().optional(),
  assignedBatchId: z.uuid().optional(),
});

const updateStudentSchema = z.object({
  id: z.uuid({ error: 'Invalid student ID' }),
  studentName: z.string().min(2).optional(),
  studentAge: z.number().min(4).max(100).optional(),
  parentName: z.string().min(2).optional(),
  timezone: z.string().optional(),
  country: z.string().optional(),
  level: z.string().optional(),
  chessUsernames: z.string().optional(),
  rating: z.number().optional(),
});

const updateStatusSchema = z.object({
  id: z.uuid({ error: 'Invalid student ID' }),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']),
});

const assignCoachSchema = z.object({
  id: z.uuid({ error: 'Invalid student ID' }),
  coachId: z.uuid({ error: 'Invalid coach ID' }),
});

const assignBatchSchema = z.object({
  id: z.uuid({ error: 'Invalid student ID' }),
  batchId: z.uuid({ error: 'Invalid batch ID' }),
});

const listStudentsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
  studentType: z.enum(['1-1', 'GROUP']).optional(),
  coachId: z.uuid().optional(),
  batchId: z.uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const removeFromBatchSchema = z.object({
  id: z.uuid({ error: 'Invalid student ID' }),
});

const updateScheduleSchema = z.object({
  id: z.uuid({ error: 'Invalid student ID' }),
  meetingLink: z.string().url().optional().or(z.literal('')),
  recurringSchedule: z.string().optional(), // JSON
});

export const studentRouter = router({
  // List students (filtered by role)
  list: protectedProcedure.input(listStudentsSchema).query(async ({ ctx, input }) => {
    const conditions = [];

    // Role-based filtering
    if (ctx.user.role === 'CUSTOMER') {
      // Customers only see their own students
      conditions.push(eq(students.accountId, ctx.user.id));
    } else if (ctx.user.role === 'COACH') {
      // Coaches only see their assigned students
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);

      if (!coach) {
        return { students: [], total: 0 };
      }
      conditions.push(eq(students.assignedCoachId, coach.id));
    }
    // Admins see all students

    // Optional filters
    if (input.status) {
      conditions.push(eq(students.status, input.status));
    }

    if (input.studentType) {
      conditions.push(eq(students.studentType, input.studentType));
    }

    if (input.coachId && ctx.user.role === 'ADMIN') {
      conditions.push(eq(students.assignedCoachId, input.coachId));
    }

    if (input.batchId) {
      conditions.push(eq(students.assignedBatchId, input.batchId));
    }

    if (input.search) {
      const searchPattern = `%${input.search}%`;
      conditions.push(
        sql`(${students.studentName} ILIKE ${searchPattern} OR ${students.parentName} ILIKE ${searchPattern})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(whereClause);
    const count = countResult[0]?.count ?? 0;

    // Get students with pagination
    const studentList = await ctx.db
      .select({
        id: students.id,
        studentName: students.studentName,
        studentAge: students.studentAge,
        parentName: students.parentName,
        studentType: students.studentType,
        level: students.level,
        rating: students.rating,
        status: students.status,
        assignedCoachId: students.assignedCoachId,
        assignedBatchId: students.assignedBatchId,
        meetingLink: students.meetingLink,
        recurringSchedule: students.recurringSchedule,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(whereClause)
      .orderBy(desc(students.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return {
      students: studentList,
      total: count,
    };
  }),

  // Get student by ID
  getById: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [student] = await ctx.db
      .select()
      .from(students)
      .where(eq(students.id, input.id))
      .limit(1);

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Student not found',
      });
    }

    // Check access based on role
    if (ctx.user.role === 'CUSTOMER' && student.accountId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only view your own students',
      });
    }

    if (ctx.user.role === 'COACH') {
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);

      if (!coach || student.assignedCoachId !== coach.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view students assigned to you',
        });
      }
    }

    return student;
  }),

  // Create student (admin only - typically from demo conversion)
  create: adminProcedure.input(createStudentSchema).mutation(async ({ ctx, input }) => {
    // Verify account exists
    const [account] = await ctx.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, input.accountId))
      .limit(1);

    if (!account) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found',
      });
    }

    // Verify coach exists if provided
    if (input.assignedCoachId) {
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.id, input.assignedCoachId))
        .limit(1);

      if (!coach) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Coach not found',
        });
      }
    }

    // Verify batch exists if provided
    if (input.assignedBatchId) {
      const [batch] = await ctx.db
        .select({ id: batches.id })
        .from(batches)
        .where(eq(batches.id, input.assignedBatchId))
        .limit(1);

      if (!batch) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Batch not found',
        });
      }
    }

    const [student] = await ctx.db
      .insert(students)
      .values({
        accountId: input.accountId,
        studentName: input.studentName,
        studentAge: input.studentAge,
        parentName: input.parentName,
        parentEmail: input.parentEmail.toLowerCase(),
        timezone: input.timezone,
        country: input.country,
        studentType: input.studentType,
        level: input.level,
        chessUsernames: input.chessUsernames,
        rating: input.rating,
        assignedCoachId: input.assignedCoachId,
        assignedBatchId: input.assignedBatchId,
        status: 'ACTIVE',
      })
      .returning();

    return student;
  }),

  // Update student info (admin only)
  update: adminProcedure.input(updateStudentSchema).mutation(async ({ ctx, input }) => {
    const [student] = await ctx.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, input.id))
      .limit(1);

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Student not found',
      });
    }

    const { id, ...updateData } = input;

    const [updated] = await ctx.db
      .update(students)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(students.id, id))
      .returning();

    return updated;
  }),

  // Update student status (admin only)
  updateStatus: adminProcedure.input(updateStatusSchema).mutation(async ({ ctx, input }) => {
    const [student] = await ctx.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, input.id))
      .limit(1);

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Student not found',
      });
    }

    const [updated] = await ctx.db
      .update(students)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(students.id, input.id))
      .returning();

    return updated;
  }),

  // Assign coach (admin only)
  assignCoach: adminProcedure.input(assignCoachSchema).mutation(async ({ ctx, input }) => {
    // Verify student exists
    const [student] = await ctx.db
      .select({
        id: students.id,
        studentName: students.studentName,
        accountId: students.accountId,
        studentType: students.studentType,
      })
      .from(students)
      .where(eq(students.id, input.id))
      .limit(1);

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Student not found',
      });
    }

    // Verify coach exists
    const [coach] = await ctx.db
      .select({
        id: coaches.id,
        name: coaches.name,
        accountId: coaches.accountId,
      })
      .from(coaches)
      .where(eq(coaches.id, input.coachId))
      .limit(1);

    if (!coach) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Coach not found',
      });
    }

    const [updated] = await ctx.db
      .update(students)
      .set({
        assignedCoachId: input.coachId,
        updatedAt: new Date(),
      })
      .where(eq(students.id, input.id))
      .returning();

    // Send notifications
    // Notify parent that coach has been assigned
    studentNotifications.onCoachAssigned(student.accountId, {
      studentName: student.studentName,
      coachName: coach.name,
    });

    // Notify coach about new student
    coachNotifications.onStudentAssigned(coach.accountId, {
      studentName: student.studentName,
      studentType: student.studentType,
    });

    return updated;
  }),

  // Assign batch (admin only)
  assignBatch: adminProcedure.input(assignBatchSchema).mutation(async ({ ctx, input }) => {
    // Verify student exists
    const [student] = await ctx.db
      .select({ id: students.id, studentType: students.studentType })
      .from(students)
      .where(eq(students.id, input.id))
      .limit(1);

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Student not found',
      });
    }

    // Only GROUP students can be assigned to batches
    if (student.studentType !== 'GROUP') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only GROUP students can be assigned to batches',
      });
    }

    // Verify batch exists and has capacity
    const [batch] = await ctx.db
      .select({
        id: batches.id,
        maxStudents: batches.maxStudents,
        coachId: batches.coachId,
      })
      .from(batches)
      .where(eq(batches.id, input.batchId))
      .limit(1);

    if (!batch) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Batch not found',
      });
    }

    // Check batch capacity
    const capacityResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.assignedBatchId, input.batchId));
    const count = capacityResult[0]?.count ?? 0;

    if (count >= (batch.maxStudents || 10)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Batch is at full capacity',
      });
    }

    const [updated] = await ctx.db
      .update(students)
      .set({
        assignedBatchId: input.batchId,
        assignedCoachId: batch.coachId, // Auto-assign batch's coach
        updatedAt: new Date(),
      })
      .where(eq(students.id, input.id))
      .returning();

    return updated;
  }),

  // Remove student from batch (admin only)
  removeFromBatch: adminProcedure.input(removeFromBatchSchema).mutation(async ({ ctx, input }) => {
    const [student] = await ctx.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, input.id))
      .limit(1);

    if (!student) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Student not found',
      });
    }

    const [updated] = await ctx.db
      .update(students)
      .set({
        assignedBatchId: null,
        updatedAt: new Date(),
      })
      .where(eq(students.id, input.id))
      .returning();

    return updated;
  }),

  // Request Review Session (Customer)
  requestReview: protectedProcedure
    .input(
      z.object({
        studentId: z.uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get student and verify ownership
      const [student] = await ctx.db
        .select()
        .from(students)
        .where(eq(students.id, input.studentId))
        .limit(1);

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Student not found',
        });
      }

      if (ctx.user.role === 'CUSTOMER' && student.accountId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your student' });
      }

      // Check limit (1 per month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [existing] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviewRequests)
        .where(
          and(
            eq(reviewRequests.studentId, input.studentId),
            sql`${reviewRequests.createdAt} >= ${startOfMonth.toISOString()}`,
            sql`${reviewRequests.createdAt} <= ${endOfMonth.toISOString()}`
          )
        );

      if ((existing?.count ?? 0) >= 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Limit reached: You can only request one review session per month for this student.',
        });
      }

      // Create request
      const [request] = await ctx.db
        .insert(reviewRequests)
        .values({
          studentId: input.studentId,
          reason: input.reason,
        })
        .returning();

      return request;
    }),

  // List Review Requests (Admin)
  listReviewRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.status) {
        conditions.push(eq(reviewRequests.status, input.status));
      }

      const requests = await ctx.db
        .select({
          id: reviewRequests.id,
          studentName: students.studentName,
          reason: reviewRequests.reason,
          status: reviewRequests.status,
          createdAt: reviewRequests.createdAt,
          adminNotes: reviewRequests.adminNotes,
          studentId: students.id,
        })
        .from(reviewRequests)
        .innerJoin(students, eq(reviewRequests.studentId, students.id))
        .where(and(...conditions))
        .orderBy(desc(reviewRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return requests;
    }),

  // Update Review Request (Admin)
  updateReviewRequestStatus: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(reviewRequests)
        .set({
          status: input.status,
          adminNotes: input.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(reviewRequests.id, input.id))
        .returning();
      return updated;
    }),

  // Update Schedule (Coach & Admin)
  updateSchedule: protectedProcedure
    .input(updateScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      // Get student to verify permissions
      const [student] = await ctx.db
        .select({
          id: students.id,
          assignedCoachId: students.assignedCoachId,
        })
        .from(students)
        .where(eq(students.id, input.id))
        .limit(1);

      if (!student) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Student not found',
        });
      }

      // Permission check
      if (ctx.user.role === 'CUSTOMER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Customers cannot update schedules',
        });
      }

      if (ctx.user.role === 'COACH') {
        // Check if this coach is assigned to the student
        const [coach] = await ctx.db
          .select({ id: coaches.id })
          .from(coaches)
          .where(eq(coaches.accountId, ctx.user.id))
          .limit(1);

        if (!coach || student.assignedCoachId !== coach.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update schedules for your assigned students',
          });
        }
      }

      // Update fields
      const [updated] = await ctx.db
        .update(students)
        .set({
          meetingLink: input.meetingLink,
          recurringSchedule: input.recurringSchedule,
          updatedAt: new Date(),
        })
        .where(eq(students.id, input.id))
        .returning();

      return updated;
    }),
});
