// Subscription Router - handles plans and subscriptions

import { TRPCError } from '@trpc/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { accounts, plans, subscriptions } from '../db/schema';
import { adminProcedure, protectedProcedure, publicProcedure, router } from '../trpc';

const createSubscriptionSchema = z.object({
  accountId: z.uuid(),
  planId: z.uuid(),
  startedAt: z.iso.datetime().optional(),
});

const updateStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(['ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED']),
});

export const subscriptionRouter = router({
  // Get available plans (public)
  getPlans: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.amount);
  }),

  // Create subscription (admin only)
  create: adminProcedure.input(createSubscriptionSchema).mutation(async ({ ctx, input }) => {
    // Verify account exists
    const [account] = await ctx.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, input.accountId))
      .limit(1);
    if (!account)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found',
      });

    // Verify plan exists
    const [plan] = await ctx.db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
    if (!plan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });

    // Calculate next due date based on billing cycle
    const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();
    const nextDueAt = new Date(startedAt);
    switch (plan.billingCycle) {
      case 'monthly':
        nextDueAt.setMonth(nextDueAt.getMonth() + 1);
        break;
      case 'quarterly':
        nextDueAt.setMonth(nextDueAt.getMonth() + 3);
        break;
      case 'yearly':
        nextDueAt.setFullYear(nextDueAt.getFullYear() + 1);
        break;
    }

    const [subscription] = await ctx.db
      .insert(subscriptions)
      .values({
        accountId: input.accountId,
        planId: input.planId,
        amount: plan.amount,
        billingCycle: plan.billingCycle,
        startedAt,
        nextDueAt,
        status: 'ACTIVE',
      })
      .returning();

    return subscription;
  }),

  // Get subscription by ID
  getById: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [subscription] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, input.id))
      .limit(1);
    if (!subscription)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found',
      });

    // Check access
    if (ctx.user.role !== 'ADMIN' && subscription.accountId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    // Get plan details
    const [plan] = await ctx.db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.planId))
      .limit(1);

    return { ...subscription, plan };
  }),

  // Update subscription status (admin only)
  updateStatus: adminProcedure.input(updateStatusSchema).mutation(async ({ ctx, input }) => {
    const [subscription] = await ctx.db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.id, input.id))
      .limit(1);
    if (!subscription)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Subscription not found',
      });

    const [updated] = await ctx.db
      .update(subscriptions)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(subscriptions.id, input.id))
      .returning();
    return updated;
  }),

  // Get payment history
  getPaymentHistory: protectedProcedure
    .input(z.object({ accountId: z.uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let targetAccountId = ctx.user.id;

      // Admin can view any account's history
      if (ctx.user.role === 'ADMIN' && input.accountId) {
        targetAccountId = input.accountId;
      } else if (ctx.user.role !== 'ADMIN' && input.accountId && input.accountId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Can only view your own payment history',
        });
      }

      return await ctx.db
        .select({
          id: subscriptions.id,
          amount: subscriptions.amount,
          billingCycle: subscriptions.billingCycle,
          status: subscriptions.status,
          startedAt: subscriptions.startedAt,
          nextDueAt: subscriptions.nextDueAt,
          createdAt: subscriptions.createdAt,
        })
        .from(subscriptions)
        .where(eq(subscriptions.accountId, targetAccountId))
        .orderBy(desc(subscriptions.createdAt));
    }),

  // Get my subscriptions
  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const subs = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.accountId, ctx.user.id))
      .orderBy(desc(subscriptions.createdAt));

    // Attach plan details
    return await Promise.all(
      subs.map(async (sub: (typeof subs)[number]) => {
        const planResult = await ctx.db
          .select()
          .from(plans)
          .where(eq(plans.id, sub.planId))
          .limit(1);
        return { ...sub, plan: planResult[0] ?? null };
      })
    );
  }),
});
