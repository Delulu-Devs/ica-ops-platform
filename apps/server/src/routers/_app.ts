// tRPC App Router - Main entry point for all API routes
import { router } from '../trpc';
import { analyticsRouter } from './analytics';
import { authRouter } from './auth';
import { batchRouter } from './batch';
import { chatRouter } from './chat';
import { coachRouter } from './coach';
import { demoRouter } from './demo';
import { studentRouter } from './student';
import { subscriptionRouter } from './subscription';

// Combine all routers into the main app router
export const appRouter = router({
  auth: authRouter,
  demo: demoRouter,
  student: studentRouter,
  coach: coachRouter,
  batch: batchRouter,
  chat: chatRouter,
  analytics: analyticsRouter,
  subscription: subscriptionRouter,
});

// Export type for client-side type inference
export type AppRouter = typeof appRouter;
