// tRPC context and procedures setup
import { initTRPC, TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import type { Context as HonoContext } from 'hono';
import { db } from './db';
import { accounts, type Role } from './db/schema';
import { extractBearerToken, verifyAccessToken } from './lib/jwt';
import { rateLimiter } from './lib/redis';
// import { ZodError } from "zod"; // Commented out as superjson is not being used

// Context type for tRPC procedures
export interface Context {
  [key: string]: unknown; // Index signature for @hono/trpc-server compatibility
  honoContext: HonoContext;
  db: typeof db;
  user: {
    id: string;
    email: string;
    role: Role;
  } | null;
}

// Create context from Hono request
export async function createContext(honoContext: HonoContext): Promise<Context> {
  // Extract and verify JWT token
  const authHeader = honoContext.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  let user: Context['user'] = null;

  if (token) {
    const payload = await verifyAccessToken(token);
    if (payload) {
      user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    }
  }

  return {
    honoContext,
    db,
    user,
  };
}

// Initialize tRPC with context
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Include validation errors if available
        zodError:
          error.cause instanceof Error && error.cause.name === 'ZodError'
            ? JSON.parse(error.cause.message)
            : null,
      },
    };
  },
});

// Export router and procedure creators
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Auth middleware - requires authenticated user
const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  // Verify user still exists in database
  const [account] = await ctx.db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, ctx.user.id))
    .limit(1);

  if (!account) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Account no longer exists',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // TypeScript now knows user is not null
    },
  });
});

// Admin middleware - requires ADMIN role
const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only admins can access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Coach middleware - requires COACH or ADMIN role
const isCoachOrAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  if (ctx.user.role !== 'ADMIN' && ctx.user.role !== 'COACH') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only coaches and admins can access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Rate limiting middleware factory
const withRateLimit = (limit: number, windowSeconds: number) =>
  middleware(async ({ ctx, next }) => {
    const identifier = ctx.user?.id || ctx.honoContext.req.header('x-forwarded-for') || 'anonymous';
    const path = ctx.honoContext.req.path;
    const key = `${path}:${identifier}`;

    const { limited, remaining, resetIn } = await rateLimiter.isLimited(key, limit, windowSeconds);

    // Set rate limit headers
    ctx.honoContext.header('X-RateLimit-Limit', String(limit));
    ctx.honoContext.header('X-RateLimit-Remaining', String(remaining));
    ctx.honoContext.header('X-RateLimit-Reset', String(resetIn));

    if (limited) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${resetIn} seconds`,
      });
    }

    return next();
  });

// Protected procedure - requires authentication
export const protectedProcedure = publicProcedure.use(isAuthenticated);

// Admin procedure - requires ADMIN role
export const adminProcedure = publicProcedure.use(isAdmin);

// Coach procedure - requires COACH or ADMIN role
export const coachProcedure = publicProcedure.use(isCoachOrAdmin);

// Rate limits are more lenient in development
const isDev = process.env.NODE_ENV === 'development';

// Rate-limited public procedure (for auth endpoints)
export const rateLimitedProcedure = publicProcedure.use(
  withRateLimit(isDev ? 100 : 5, 60) // 100/min in dev, 5/min in prod
);

// Standard rate-limited procedure for regular read operations
export const standardProcedure = protectedProcedure.use(
  withRateLimit(isDev ? 500 : 100, 60) // 500/min in dev, 100/min in prod
);

// Write operation rate-limited procedure
export const writeProcedure = protectedProcedure.use(
  withRateLimit(isDev ? 200 : 30, 60) // 200/min in dev, 30/min in prod
);
