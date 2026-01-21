// Demo Router - handles demo booking and management

import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { accounts, coaches, demos, plans, students, subscriptions } from '../db/schema';
import { emailService } from '../lib/email';
import { generateRandomPassword, hashPassword } from '../lib/password';
import { demoNotifications } from '../services/notifications';
import {
  adminProcedure,
  coachProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from '../trpc';

// Input validation schemas
const createDemoSchema = z.object({
  studentName: z.string().min(2, { error: 'Student name is required' }),
  studentAge: z.number().min(4).max(100).optional(),
  parentName: z.string().min(2, { error: 'Parent name is required' }),
  parentEmail: z.email({ error: 'Valid email is required' }),
  timezone: z.string().optional(),
  country: z.string().optional(),
  scheduledStart: z.iso.datetime({ error: 'Invalid date format' }),
  scheduledEnd: z.iso.datetime({ error: 'Invalid date format' }),
});

const updateStatusSchema = z.object({
  id: z.uuid({ error: 'Invalid demo ID' }),
  status: z.enum([
    'BOOKED',
    'ATTENDED',
    'NO_SHOW',
    'RESCHEDULED',
    'CANCELLED',
    'INTERESTED',
    'NOT_INTERESTED',
    'PAYMENT_PENDING',
    'CONVERTED',
    'DROPPED',
  ]),
});

const submitOutcomeSchema = z.object({
  id: z.uuid({ error: 'Invalid demo ID' }),
  status: z.enum(['INTERESTED', 'NOT_INTERESTED']),
  recommendedStudentType: z.enum(['1-1', 'GROUP']).optional(),
  recommendedLevel: z.string().optional(),
  adminNotes: z.string().optional(),
});

const rescheduleSchema = z.object({
  id: z.uuid({ error: 'Invalid demo ID' }),
  scheduledStart: z.iso.datetime({ error: 'Invalid date format' }),
  scheduledEnd: z.iso.datetime({ error: 'Invalid date format' }),
});

const assignCoachSchema = z.object({
  id: z.uuid({ error: 'Invalid demo ID' }),
  coachId: z.uuid({ error: 'Invalid coach ID' }),
});

const listDemosSchema = z.object({
  status: z
    .enum([
      'BOOKED',
      'ATTENDED',
      'NO_SHOW',
      'RESCHEDULED',
      'CANCELLED',
      'INTERESTED',
      'NOT_INTERESTED',
      'PAYMENT_PENDING',
      'CONVERTED',
      'DROPPED',
    ])
    .optional(),
  search: z.string().optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  includeStats: z.boolean().default(false),
});

export const demoRouter = router({
  // Create demo (public - for demo booking)
  create: publicProcedure.input(createDemoSchema).mutation(async ({ ctx, input }) => {
    // Validate date range
    const start = new Date(input.scheduledStart);
    const end = new Date(input.scheduledEnd);

    if (start >= end) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'End time must be after start time',
      });
    }

    if (start < new Date()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot schedule demo in the past',
      });
    }

    // Find an available coach or leave unassigned
    // In a production app, you'd implement smart coach assignment here
    const [availableCoach] = await ctx.db.select({ id: coaches.id }).from(coaches).limit(1);

    // Find an admin to assign
    const [admin] = await ctx.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.role, 'ADMIN'))
      .limit(1);

    // Create the demo
    const [demo] = await ctx.db
      .insert(demos)
      .values({
        studentName: input.studentName,
        studentAge: input.studentAge,
        parentName: input.parentName,
        parentEmail: input.parentEmail.toLowerCase(),
        timezone: input.timezone,
        country: input.country,
        scheduledStart: start,
        scheduledEnd: end,
        coachId: availableCoach?.id || null,
        adminId: admin?.id || null,
        status: 'BOOKED',
      })
      .returning();

    // Send email confirmation
    try {
      await emailService.sendDemoConfirmation(
        input.parentEmail,
        input.studentName,
        start,
        `https://meet.google.com/${Math.random().toString(36).substring(7)}`
      );
    } catch (err) {
      console.error('Failed to send confirmation email:', err);
    }

    // Send notifications
    if (admin?.id) {
      demoNotifications.onDemoBooked(admin.id, {
        studentName: input.studentName,
        scheduledStart: start,
      });
    }

    if (availableCoach?.id) {
      // Get coach's account ID for notification
      const [coachAccount] = await ctx.db
        .select({ accountId: coaches.accountId })
        .from(coaches)
        .where(eq(coaches.id, availableCoach.id))
        .limit(1);

      if (coachAccount?.accountId) {
        demoNotifications.onDemoAssigned(coachAccount.accountId, {
          studentName: input.studentName,
          scheduledStart: start,
        });
      }
    }

    return demo;
  }),

  // List demos (filtered by role)
  list: coachProcedure.input(listDemosSchema).query(async ({ ctx, input }) => {
    const conditions = [];

    // Role-based filtering
    if (ctx.user.role === 'COACH') {
      // Coaches only see their assigned demos
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);

      if (!coach) {
        return {
          demos: [],
          total: 0,
          stats: {
            completed: 0,
            pending: 0,
            converted: 0,
          },
        };
      }
      conditions.push(eq(demos.coachId, coach.id));
    }
    // Admins see all demos

    // Optional filters
    if (input.status) {
      conditions.push(eq(demos.status, input.status));
    }

    if (input.startDate) {
      conditions.push(gte(demos.scheduledStart, new Date(input.startDate)));
    }

    if (input.endDate) {
      conditions.push(lte(demos.scheduledStart, new Date(input.endDate)));
    }

    if (input.search) {
      conditions.push(
        or(
          ilike(demos.studentName, `%${input.search}%`),
          ilike(demos.parentName, `%${input.search}%`),
          ilike(demos.parentEmail, `%${input.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(demos)
      .where(whereClause);
    const count = countResult[0]?.count ?? 0;

    // Get demos with pagination
    const demoList = await ctx.db
      .select({
        id: demos.id,
        studentName: demos.studentName,
        parentName: demos.parentName,
        scheduledStart: demos.scheduledStart,
        scheduledEnd: demos.scheduledEnd,
        status: demos.status,
        coachId: demos.coachId,
        adminId: demos.adminId,
        createdAt: demos.createdAt,
      })
      .from(demos)
      .where(whereClause)
      .orderBy(desc(demos.scheduledStart))
      .limit(input.limit)
      .offset(input.offset);

    // Get stats (only for initial page load to save resources)
    let stats = {
      completed: 0,
      pending: 0,
      converted: 0,
    };

    if (input.includeStats) {
      // Calculate stats using a single optimized query with aggregation
      const statsResult = await ctx.db
        .select({
          status: demos.status,
          count: sql<number>`count(*)::int`,
        })
        .from(demos)
        .groupBy(demos.status);

      let totalCompleted = 0;
      let totalPending = 0;
      let totalConverted = 0;
      statsResult.forEach((row) => {
        const count = row.count;

        if (['ATTENDED', 'CONVERTED', 'INTERESTED', 'PAYMENT_PENDING'].includes(row.status)) {
          totalCompleted += count;
        }

        if (['BOOKED', 'RESCHEDULED'].includes(row.status)) {
          totalPending += count;
        }

        if (row.status === 'CONVERTED') {
          totalConverted += count;
        }
      });

      stats = {
        completed: totalCompleted,
        pending: totalPending,
        converted: totalConverted,
      };
    }

    return {
      demos: demoList,
      total: count,
      stats,
    };
  }),

  // Get demo by ID
  getById: coachProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [demo] = await ctx.db.select().from(demos).where(eq(demos.id, input.id)).limit(1);

    if (!demo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demo not found',
      });
    }

    // Check access for coaches
    if (ctx.user.role === 'COACH') {
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);

      if (!coach || demo.coachId !== coach.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view demos assigned to you',
        });
      }
    }

    return demo;
  }),

  // Update demo status (admin only)
  updateStatus: adminProcedure.input(updateStatusSchema).mutation(async ({ ctx, input }) => {
    const [demo] = await ctx.db
      .select({
        id: demos.id,
        status: demos.status,
        studentName: demos.studentName,
        coachId: demos.coachId,
      })
      .from(demos)
      .where(eq(demos.id, input.id))
      .limit(1);

    if (!demo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demo not found',
      });
    }

    const oldStatus = demo.status;

    // Update status
    const [updated] = await ctx.db
      .update(demos)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(demos.id, input.id))
      .returning();

    // Send notification to coach if assigned
    if (demo.coachId) {
      const [coachAccount] = await ctx.db
        .select({ accountId: coaches.accountId })
        .from(coaches)
        .where(eq(coaches.id, demo.coachId))
        .limit(1);

      if (coachAccount?.accountId) {
        demoNotifications.onDemoStatusChanged(coachAccount.accountId, {
          studentName: demo.studentName,
          oldStatus,
          newStatus: input.status,
        });
      }
    }

    return updated;
  }),

  // Submit outcome form (admin only, mandatory after demo)
  submitOutcome: adminProcedure.input(submitOutcomeSchema).mutation(async ({ ctx, input }) => {
    const [demo] = await ctx.db.select().from(demos).where(eq(demos.id, input.id)).limit(1);

    if (!demo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demo not found',
      });
    }

    // Demo must be in ATTENDED status to submit outcome
    if (demo.status !== 'ATTENDED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Demo must be marked as attended before submitting outcome',
      });
    }

    // Update demo with outcome
    const [updated] = await ctx.db
      .update(demos)
      .set({
        status: input.status,
        recommendedStudentType: input.recommendedStudentType,
        recommendedLevel: input.recommendedLevel,
        adminNotes: input.adminNotes,
        updatedAt: new Date(),
      })
      .where(eq(demos.id, input.id))
      .returning();

    return updated;
  }),

  // Reschedule demo (admin only)
  reschedule: adminProcedure.input(rescheduleSchema).mutation(async ({ ctx, input }) => {
    const [demo] = await ctx.db
      .select({ id: demos.id, status: demos.status })
      .from(demos)
      .where(eq(demos.id, input.id))
      .limit(1);

    if (!demo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demo not found',
      });
    }

    // Can only reschedule BOOKED or NO_SHOW demos
    if (!['BOOKED', 'NO_SHOW'].includes(demo.status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only booked or no-show demos can be rescheduled',
      });
    }

    const start = new Date(input.scheduledStart);
    const end = new Date(input.scheduledEnd);

    if (start >= end) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'End time must be after start time',
      });
    }

    if (start < new Date()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot schedule demo in the past',
      });
    }

    const [updated] = await ctx.db
      .update(demos)
      .set({
        scheduledStart: start,
        scheduledEnd: end,
        status: 'RESCHEDULED',
        updatedAt: new Date(),
      })
      .where(eq(demos.id, input.id))
      .returning();

    return updated;
  }),

  // Assign coach to demo (admin only)
  assignCoach: adminProcedure.input(assignCoachSchema).mutation(async ({ ctx, input }) => {
    // Verify demo exists
    const [demo] = await ctx.db
      .select({ id: demos.id })
      .from(demos)
      .where(eq(demos.id, input.id))
      .limit(1);

    if (!demo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demo not found',
      });
    }

    // Verify coach exists
    const [coach] = await ctx.db
      .select({ id: coaches.id })
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
      .update(demos)
      .set({
        coachId: input.coachId,
        updatedAt: new Date(),
      })
      .where(eq(demos.id, input.id))
      .returning();

    return updated;
  }),

  // Cancel demo (admin only)
  cancel: adminProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [demo] = await ctx.db
      .select({ id: demos.id, status: demos.status })
      .from(demos)
      .where(eq(demos.id, input.id))
      .limit(1);

    if (!demo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demo not found',
      });
    }

    // Can't cancel already completed demos
    if (['CONVERTED', 'DROPPED', 'CANCELLED'].includes(demo.status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This demo cannot be cancelled',
      });
    }

    const [updated] = await ctx.db
      .update(demos)
      .set({
        status: 'CANCELLED',
        updatedAt: new Date(),
      })
      .where(eq(demos.id, input.id))
      .returning();

    return updated;
  }),

  // Send payment link (admin only)
  sendPaymentLink: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [demo] = await ctx.db
        .select({
          id: demos.id,
          status: demos.status,
          studentName: demos.studentName,
          parentEmail: demos.parentEmail,
        })
        .from(demos)
        .where(eq(demos.id, input.id))
        .limit(1);

      if (!demo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Demo not found',
        });
      }

      if (demo.status !== 'INTERESTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only send payment link for demos marked as INTERESTED',
        });
      }

      // Send payment link email
      await emailService.sendPaymentLink(demo.parentEmail, demo.studentName, 100); // Amount hardcoded for simulation

      // Update status
      const [updated] = await ctx.db
        .update(demos)
        .set({
          status: 'PAYMENT_PENDING',
          updatedAt: new Date(),
        })
        .where(eq(demos.id, input.id))
        .returning();

      return updated;
    }),

  // Convert demo to student (admin only)
  convert: adminProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const [demo] = await ctx.db.select().from(demos).where(eq(demos.id, input.id)).limit(1);

    if (!demo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demo not found',
      });
    }

    if (demo.status !== 'PAYMENT_PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Demo must be in PAYMENT_PENDING status to simulate payment and convert',
      });
    }

    // 1. Check/Create Account
    let accountId: string;
    let generatedPassword: string | undefined;
    // Ensure case-insensitive match for existing account
    const parentEmailLower = demo.parentEmail.toLowerCase();

    const [existingAccount] = await ctx.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(sql`lower(${accounts.email}) = ${parentEmailLower}`)
      .limit(1);

    if (existingAccount) {
      accountId = existingAccount.id;
    } else {
      // Generate random password for new account
      generatedPassword = generateRandomPassword();
      const passwordHash = await hashPassword(generatedPassword);

      const [newAccount] = await ctx.db
        .insert(accounts)
        .values({
          email: parentEmailLower,
          passwordHash,
          role: 'CUSTOMER',
          authProvider: 'email',
        })
        .returning();

      if (!newAccount) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create account',
        });
      }
      accountId = newAccount.id;
    }

    // 2. Create Student
    await ctx.db.insert(students).values({
      accountId,
      studentName: demo.studentName,
      studentAge: demo.studentAge,
      parentName: demo.parentName,
      parentEmail: parentEmailLower,
      timezone: demo.timezone,
      country: demo.country,
      studentType: demo.recommendedStudentType || 'GROUP',
      level: demo.recommendedLevel,
      assignedCoachId: demo.coachId,
      status: 'ACTIVE',
    });

    // 3. Create Subscription (New Step)
    // Find a matching active plan
    const [plan] = await ctx.db
      .select()
      .from(plans)
      .where(
        and(eq(plans.studentType, demo.recommendedStudentType || 'GROUP'), eq(plans.isActive, true))
      )
      .limit(1);

    let planId = plan?.id;
    let planAmount = plan?.amount;
    let planCycle = plan?.billingCycle;

    if (!planId) {
      // Create a default plan if none exists (fallback)
      const [newPlan] = await ctx.db
        .insert(plans)
        .values({
          name: `${demo.recommendedStudentType || 'GROUP'} Standard Plan`,
          amount: '100.00', // Default amount
          studentType: demo.recommendedStudentType || 'GROUP',
          billingCycle: 'monthly',
          description: 'Auto-created default plan',
        })
        .returning();

      if (!newPlan) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create default plan',
        });
      }

      planId = newPlan.id;
      planAmount = newPlan.amount;
      planCycle = newPlan.billingCycle;
    }

    // Create active subscription
    await ctx.db.insert(subscriptions).values({
      accountId,
      planId: planId!,
      amount: planAmount!,
      billingCycle: planCycle!,
      status: 'ACTIVE',
      startedAt: new Date(),
      nextDueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    });

    // 4. Update Demo Status
    const [updated] = await ctx.db
      .update(demos)
      .set({
        status: 'CONVERTED',
        updatedAt: new Date(),
      })
      .where(eq(demos.id, input.id))
      .returning();

    // 5. Send Welcome Email (Non-blocking)
    try {
      if (!existingAccount && generatedPassword) {
        // Send email with credentials
        await emailService.sendWelcomeEmail(demo.parentEmail, demo.studentName, generatedPassword);
      } else {
        // Just welcome email (account existed)
        await emailService.sendWelcomeEmail(demo.parentEmail, demo.studentName);
      }
    } catch (error) {
      console.error('Failed to send welcome email during conversion:', error);
      // Don't throw, just log. The conversion was successful.
    }

    return updated;
  }),
  // Update meeting link (admin or assigned coach)
  updateMeetingLink: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        meetingLink: z.string().url({ error: 'Invalid URL' }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [demo] = await ctx.db
        .select({ id: demos.id, coachId: demos.coachId })
        .from(demos)
        .where(eq(demos.id, input.id))
        .limit(1);

      if (!demo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Demo not found',
        });
      }

      // Authorization check
      if (ctx.user.role === 'COACH') {
        const [coach] = await ctx.db
          .select({ id: coaches.id })
          .from(coaches)
          .where(eq(coaches.accountId, ctx.user.id))
          .limit(1);

        if (!coach || demo.coachId !== coach.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update demos assigned to you',
          });
        }
      }

      const [updated] = await ctx.db
        .update(demos)
        .set({
          meetingLink: input.meetingLink,
          updatedAt: new Date(),
        })
        .where(eq(demos.id, input.id))
        .returning();

      return updated;
    }),
});
