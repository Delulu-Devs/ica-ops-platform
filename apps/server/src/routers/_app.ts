// tRPC App Router - Main entry point
// TODO: Implement routers

import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// TODO: Add protected and admin procedures with auth middleware

export const appRouter = router({
    // auth: authRouter,
    // demo: demoRouter,
    // student: studentRouter,
    // coach: coachRouter,
    // batch: batchRouter,
    // chat: chatRouter,
    // analytics: analyticsRouter,
    // payment: paymentRouter,
    // subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;
