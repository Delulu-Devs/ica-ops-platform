// Analytics Router - handles metrics and reporting

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  accounts,
  coaches,
  demos,
  students,
  subscriptions,
} from "../db/schema";
import { adminProcedure, router } from "../trpc";

const dateRangeSchema = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
});

// Helper function to safely get count from query result
function _getCount(
  result: Array<{ count: number }> | undefined,
  _key: "count" = "count",
): number {
  return result?.[0]?.count ?? 0;
}

export const analyticsRouter = router({
  // Get conversion funnel metrics
  getFunnel: adminProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.startDate)
        conditions.push(gte(demos.createdAt, new Date(input.startDate)));
      if (input.endDate)
        conditions.push(lte(demos.createdAt, new Date(input.endDate)));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get counts by status
      const statusCounts = await ctx.db
        .select({
          status: demos.status,
          count: sql<number>`count(*)::int`,
        })
        .from(demos)
        .where(whereClause)
        .groupBy(demos.status);

      const counts: Record<string, number> = {};
      for (const row of statusCounts) {
        counts[row.status] = row.count;
      }

      const booked = Object.values(counts).reduce((a, b) => a + b, 0);
      const attended =
        (counts.ATTENDED || 0) +
        (counts.INTERESTED || 0) +
        (counts.NOT_INTERESTED || 0) +
        (counts.PAYMENT_PENDING || 0) +
        (counts.CONVERTED || 0) +
        (counts.DROPPED || 0);
      const interested =
        (counts.INTERESTED || 0) +
        (counts.PAYMENT_PENDING || 0) +
        (counts.CONVERTED || 0) +
        (counts.DROPPED || 0);
      const converted = counts.CONVERTED || 0;

      return {
        booked,
        attended,
        interested,
        converted,
        attendanceRate: booked > 0 ? Math.round((attended / booked) * 100) : 0,
        interestRate:
          attended > 0 ? Math.round((interested / attended) * 100) : 0,
        conversionRate:
          interested > 0 ? Math.round((converted / interested) * 100) : 0,
        statusBreakdown: counts,
      };
    }),

  // Get coach performance metrics
  getCoachPerformance: adminProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const coachList = await ctx.db
        .select({ id: coaches.id, name: coaches.name })
        .from(coaches);

      const performance = await Promise.all(
        coachList.map(async (coach: { id: string; name: string }) => {
          const conditions = [eq(demos.coachId, coach.id)];
          if (input.startDate)
            conditions.push(gte(demos.createdAt, new Date(input.startDate)));
          if (input.endDate)
            conditions.push(lte(demos.createdAt, new Date(input.endDate)));

          const totalDemosResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(demos)
            .where(and(...conditions));
          const totalDemos = totalDemosResult[0]?.count ?? 0;

          const attendedResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(demos)
            .where(and(...conditions, eq(demos.status, "ATTENDED")));
          const attended = attendedResult[0]?.count ?? 0;

          const convertedResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(demos)
            .where(and(...conditions, eq(demos.status, "CONVERTED")));
          const converted = convertedResult[0]?.count ?? 0;

          const noShowsResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(demos)
            .where(and(...conditions, eq(demos.status, "NO_SHOW")));
          const noShows = noShowsResult[0]?.count ?? 0;

          const studentCountResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(students)
            .where(eq(students.assignedCoachId, coach.id));
          const studentCount = studentCountResult[0]?.count ?? 0;

          return {
            coachId: coach.id,
            coachName: coach.name,
            totalDemos,
            attended,
            converted,
            noShows,
            studentCount,
            attendanceRate:
              totalDemos > 0 ? Math.round((attended / totalDemos) * 100) : 0,
            conversionRate:
              attended > 0 ? Math.round((converted / attended) * 100) : 0,
          };
        }),
      );

      return performance;
    }),

  // Get admin efficiency metrics
  getAdminEfficiency: adminProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      // Get all admin accounts
      const adminList = await ctx.db
        .select({ id: accounts.id, email: accounts.email })
        .from(accounts)
        .where(eq(accounts.role, "ADMIN"));

      const efficiency = await Promise.all(
        adminList.map(async (admin: { id: string; email: string }) => {
          const conditions = [eq(demos.adminId, admin.id)];
          if (input.startDate)
            conditions.push(gte(demos.createdAt, new Date(input.startDate)));
          if (input.endDate)
            conditions.push(lte(demos.createdAt, new Date(input.endDate)));

          // Total demos assigned to this admin
          const totalDemosResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(demos)
            .where(and(...conditions));
          const totalDemos = totalDemosResult[0]?.count ?? 0;

          // Demos converted by this admin
          const convertedResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(demos)
            .where(and(...conditions, eq(demos.status, "CONVERTED")));
          const converted = convertedResult[0]?.count ?? 0;

          // Demos with outcome submitted (INTERESTED or NOT_INTERESTED or further)
          const outcomeSubmittedResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(demos)
            .where(
              and(
                ...conditions,
                sql`${demos.status} IN ('INTERESTED', 'NOT_INTERESTED', 'PAYMENT_PENDING', 'CONVERTED', 'DROPPED')`,
              ),
            );
          const outcomeSubmitted = outcomeSubmittedResult[0]?.count ?? 0;

          // Pending demos (BOOKED or ATTENDED without outcome)
          const pendingResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(demos)
            .where(
              and(
                ...conditions,
                sql`${demos.status} IN ('BOOKED', 'ATTENDED')`,
              ),
            );
          const pending = pendingResult[0]?.count ?? 0;

          // Calculate average response time (time from demo creation to first status update)
          // This is a simplified metric - in production you'd track status change timestamps
          const avgResponseTimeResult = await ctx.db
            .select({
              avgTime: sql<number>`EXTRACT(EPOCH FROM AVG(${demos.updatedAt} - ${demos.createdAt}))::int`,
            })
            .from(demos)
            .where(
              and(
                ...conditions,
                sql`${demos.status} NOT IN ('BOOKED')`, // Only demos that have been processed
              ),
            );
          const avgResponseTimeSeconds = avgResponseTimeResult[0]?.avgTime ?? 0;
          const avgResponseTimeHours =
            Math.round((avgResponseTimeSeconds / 3600) * 10) / 10; // Convert to hours with 1 decimal

          return {
            adminId: admin.id,
            adminEmail: admin.email,
            totalDemos,
            converted,
            outcomeSubmitted,
            pending,
            avgResponseTimeHours,
            conversionRate:
              totalDemos > 0 ? Math.round((converted / totalDemos) * 100) : 0,
            outcomeRate:
              totalDemos > 0
                ? Math.round((outcomeSubmitted / totalDemos) * 100)
                : 0,
          };
        }),
      );

      // Calculate overall stats
      const totalDemosAll = efficiency.reduce(
        (sum, e) => sum + e.totalDemos,
        0,
      );
      const convertedAll = efficiency.reduce((sum, e) => sum + e.converted, 0);
      const pendingAll = efficiency.reduce((sum, e) => sum + e.pending, 0);

      return {
        admins: efficiency,
        summary: {
          totalAdmins: efficiency.length,
          totalDemosProcessed: totalDemosAll,
          totalConverted: convertedAll,
          totalPending: pendingAll,
          overallConversionRate:
            totalDemosAll > 0
              ? Math.round((convertedAll / totalDemosAll) * 100)
              : 0,
        },
      };
    }),

  // Get dashboard summary
  getDashboard: adminProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Today's demos
    const todayDemosResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(demos)
      .where(
        and(
          gte(demos.scheduledStart, startOfDay),
          lte(demos.scheduledStart, endOfDay),
        ),
      );
    const todayDemos = todayDemosResult[0]?.count ?? 0;

    // Total active students
    const activeStudentsResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.status, "ACTIVE"));
    const activeStudents = activeStudentsResult[0]?.count ?? 0;

    // Total coaches
    const totalCoachesResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(coaches);
    const totalCoaches = totalCoachesResult[0]?.count ?? 0;

    // Pending demos (booked status)
    const pendingDemosResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(demos)
      .where(eq(demos.status, "BOOKED"));
    const pendingDemos = pendingDemosResult[0]?.count ?? 0;

    // Active subscriptions
    const activeSubscriptionsResult = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "ACTIVE"));
    const activeSubscriptions = activeSubscriptionsResult[0]?.count ?? 0;

    return {
      todayDemos,
      activeStudents,
      totalCoaches,
      pendingDemos,
      activeSubscriptions,
    };
  }),

  // Export data (returns raw data for CSV generation on client)
  export: adminProcedure
    .input(
      z.object({
        type: z.enum(["demos", "students", "subscriptions"]),
        ...dateRangeSchema.shape,
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.startDate)
        conditions.push(gte(demos.createdAt, new Date(input.startDate)));
      if (input.endDate)
        conditions.push(lte(demos.createdAt, new Date(input.endDate)));
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      if (input.type === "demos") {
        return await ctx.db.select().from(demos).where(whereClause);
      } else if (input.type === "students") {
        return await ctx.db.select().from(students);
      } else {
        return await ctx.db.select().from(subscriptions);
      }
    }),
});
