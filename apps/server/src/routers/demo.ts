// Demo Router - handles demo booking and management

import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { accounts, coaches, demos } from "../db/schema";
import { demoNotifications } from "../services/notifications";
import {
    adminProcedure,
    coachProcedure,
    publicProcedure,
    router,
} from "../trpc";

// Input validation schemas
const createDemoSchema = z.object({
  studentName: z.string().min(2, { error: "Student name is required" }),
  parentName: z.string().min(2, { error: "Parent name is required" }),
  parentEmail: z.email({ error: "Valid email is required" }),
  timezone: z.string().optional(),
  scheduledStart: z.iso.datetime({ error: "Invalid date format" }),
  scheduledEnd: z.iso.datetime({ error: "Invalid date format" }),
});

const updateStatusSchema = z.object({
  id: z.uuid({ error: "Invalid demo ID" }),
  status: z.enum([
    "BOOKED",
    "ATTENDED",
    "NO_SHOW",
    "RESCHEDULED",
    "CANCELLED",
    "INTERESTED",
    "NOT_INTERESTED",
    "PAYMENT_PENDING",
    "CONVERTED",
    "DROPPED",
  ]),
});

const submitOutcomeSchema = z.object({
  id: z.uuid({ error: "Invalid demo ID" }),
  status: z.enum(["INTERESTED", "NOT_INTERESTED"]),
  recommendedStudentType: z.enum(["1-1", "GROUP"]).optional(),
  recommendedLevel: z.string().optional(),
  adminNotes: z.string().optional(),
});

const rescheduleSchema = z.object({
  id: z.uuid({ error: "Invalid demo ID" }),
  scheduledStart: z.iso.datetime({ error: "Invalid date format" }),
  scheduledEnd: z.iso.datetime({ error: "Invalid date format" }),
});

const assignCoachSchema = z.object({
  id: z.uuid({ error: "Invalid demo ID" }),
  coachId: z.uuid({ error: "Invalid coach ID" }),
});

const listDemosSchema = z.object({
  status: z
    .enum([
      "BOOKED",
      "ATTENDED",
      "NO_SHOW",
      "RESCHEDULED",
      "CANCELLED",
      "INTERESTED",
      "NOT_INTERESTED",
      "PAYMENT_PENDING",
      "CONVERTED",
      "DROPPED",
    ])
    .optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const demoRouter = router({
  // Create demo (public - for demo booking)
  create: publicProcedure
    .input(createDemoSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate date range
      const start = new Date(input.scheduledStart);
      const end = new Date(input.scheduledEnd);

      if (start >= end) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      if (start < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot schedule demo in the past",
        });
      }

      // Find an available coach or leave unassigned
      // In a production app, you'd implement smart coach assignment here
      const [availableCoach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .limit(1);

      // Find an admin to assign
      const [admin] = await ctx.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.role, "ADMIN"))
        .limit(1);

      // Create the demo
      const [demo] = await ctx.db
        .insert(demos)
        .values({
          studentName: input.studentName,
          parentName: input.parentName,
          parentEmail: input.parentEmail.toLowerCase(),
          timezone: input.timezone,
          scheduledStart: start,
          scheduledEnd: end,
          coachId: availableCoach?.id || null,
          adminId: admin?.id || null,
          status: "BOOKED",
        })
        .returning();

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
    if (ctx.user.role === "COACH") {
      // Coaches only see their assigned demos
      const [coach] = await ctx.db
        .select({ id: coaches.id })
        .from(coaches)
        .where(eq(coaches.accountId, ctx.user.id))
        .limit(1);

      if (!coach) {
        return { demos: [], total: 0 };
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

    return {
      demos: demoList,
      total: count,
    };
  }),

  // Get demo by ID
  getById: coachProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const [demo] = await ctx.db
        .select()
        .from(demos)
        .where(eq(demos.id, input.id))
        .limit(1);

      if (!demo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demo not found",
        });
      }

      // Check access for coaches
      if (ctx.user.role === "COACH") {
        const [coach] = await ctx.db
          .select({ id: coaches.id })
          .from(coaches)
          .where(eq(coaches.accountId, ctx.user.id))
          .limit(1);

        if (!coach || demo.coachId !== coach.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view demos assigned to you",
          });
        }
      }

      return demo;
    }),

  // Update demo status (admin only)
  updateStatus: adminProcedure
    .input(updateStatusSchema)
    .mutation(async ({ ctx, input }) => {
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
          code: "NOT_FOUND",
          message: "Demo not found",
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
  submitOutcome: adminProcedure
    .input(submitOutcomeSchema)
    .mutation(async ({ ctx, input }) => {
      const [demo] = await ctx.db
        .select()
        .from(demos)
        .where(eq(demos.id, input.id))
        .limit(1);

      if (!demo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demo not found",
        });
      }

      // Demo must be in ATTENDED status to submit outcome
      if (demo.status !== "ATTENDED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Demo must be marked as attended before submitting outcome",
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
  reschedule: adminProcedure
    .input(rescheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const [demo] = await ctx.db
        .select({ id: demos.id, status: demos.status })
        .from(demos)
        .where(eq(demos.id, input.id))
        .limit(1);

      if (!demo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demo not found",
        });
      }

      // Can only reschedule BOOKED or NO_SHOW demos
      if (!["BOOKED", "NO_SHOW"].includes(demo.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only booked or no-show demos can be rescheduled",
        });
      }

      const start = new Date(input.scheduledStart);
      const end = new Date(input.scheduledEnd);

      if (start >= end) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      if (start < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot schedule demo in the past",
        });
      }

      const [updated] = await ctx.db
        .update(demos)
        .set({
          scheduledStart: start,
          scheduledEnd: end,
          status: "RESCHEDULED",
          updatedAt: new Date(),
        })
        .where(eq(demos.id, input.id))
        .returning();

      return updated;
    }),

  // Assign coach to demo (admin only)
  assignCoach: adminProcedure
    .input(assignCoachSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify demo exists
      const [demo] = await ctx.db
        .select({ id: demos.id })
        .from(demos)
        .where(eq(demos.id, input.id))
        .limit(1);

      if (!demo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demo not found",
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
          code: "NOT_FOUND",
          message: "Coach not found",
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
  cancel: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [demo] = await ctx.db
        .select({ id: demos.id, status: demos.status })
        .from(demos)
        .where(eq(demos.id, input.id))
        .limit(1);

      if (!demo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demo not found",
        });
      }

      // Can't cancel already completed demos
      if (["CONVERTED", "DROPPED", "CANCELLED"].includes(demo.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This demo cannot be cancelled",
        });
      }

      const [updated] = await ctx.db
        .update(demos)
        .set({
          status: "CANCELLED",
          updatedAt: new Date(),
        })
        .where(eq(demos.id, input.id))
        .returning();

      return updated;
    }),
});
