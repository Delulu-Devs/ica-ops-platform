// Auth Router - handles authentication and user management

import { TRPCError } from '@trpc/server';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { accounts, coaches, type Role, refreshTokens } from '../db/schema';
import { generateTokens, verifyRefreshToken } from '../lib/jwt';
import { hashPassword, validatePassword, verifyPassword } from '../lib/password';
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  rateLimitedProcedure,
  router,
} from '../trpc';

// Input validation schemas
const registerSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
  studentName: z.string().min(2, { error: 'Student name is required' }),
  parentName: z.string().min(2, { error: 'Parent name is required' }),
  timezone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
  password: z.string().min(1, { error: 'Password is required' }),
});

const createAccountSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
  role: z.enum(['ADMIN', 'COACH', 'CUSTOMER']),
  name: z.string().min(2, { error: 'Name is required' }), // For coach profile
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: 'Current password is required' }),
  newPassword: z.string().min(8, { error: 'New password must be at least 8 characters' }),
});

export const authRouter = router({
  // Register new customer account (public demo booking flow)
  register: rateLimitedProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    // Validate password strength
    const validation = validatePassword(input.password);
    if (!validation.valid) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: validation.errors.join(', '),
      });
    }

    // Check if email already exists
    const [existing] = await ctx.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, input.email.toLowerCase()))
      .limit(1);

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create account
    const insertResult = await ctx.db
      .insert(accounts)
      .values({
        email: input.email.toLowerCase(),
        passwordHash,
        role: 'CUSTOMER',
      })
      .returning();

    const account = insertResult[0];
    if (!account) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create account',
      });
    }

    // Generate tokens
    const tokens = await generateTokens({
      accountId: account.id,
      email: account.email,
      role: account.role,
    });

    // Store refresh token
    await ctx.db.insert(refreshTokens).values({
      accountId: account.id,
      token: tokens.refreshToken,
      expiresAt: tokens.refreshTokenExpiresAt,
    });

    return {
      user: {
        id: account.id,
        email: account.email,
        role: account.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }),

  // Login
  login: rateLimitedProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    // Find account by email
    const [account] = await ctx.db
      .select()
      .from(accounts)
      .where(eq(accounts.email, input.email.toLowerCase()))
      .limit(1);

    if (!account || !account.passwordHash) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isValid = await verifyPassword(input.password, account.passwordHash);
    if (!isValid) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const tokens = await generateTokens({
      accountId: account.id,
      email: account.email,
      role: account.role,
    });

    // Clean up old refresh tokens for this account
    await ctx.db.delete(refreshTokens).where(eq(refreshTokens.accountId, account.id));

    // Store new refresh token
    await ctx.db.insert(refreshTokens).values({
      accountId: account.id,
      token: tokens.refreshToken,
      expiresAt: tokens.refreshTokenExpiresAt,
    });

    return {
      user: {
        id: account.id,
        email: account.email,
        role: account.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }),

  // Logout - invalidate refresh token
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Delete all refresh tokens for this user
    await ctx.db.delete(refreshTokens).where(eq(refreshTokens.accountId, ctx.user.id));

    return { success: true };
  }),

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    const [account] = await ctx.db
      .select({
        id: accounts.id,
        email: accounts.email,
        role: accounts.role,
        createdAt: accounts.createdAt,
      })
      .from(accounts)
      .where(eq(accounts.id, ctx.user.id))
      .limit(1);

    if (!account) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found',
      });
    }

    // If coach, get coach profile
    let coachProfile = null;
    if (account.role === 'COACH') {
      const [coach] = await ctx.db
        .select({
          id: coaches.id,
          name: coaches.name,
          bio: coaches.bio,
          rating: coaches.rating,
          specializations: coaches.specializations,
        })
        .from(coaches)
        .where(eq(coaches.accountId, account.id))
        .limit(1);
      coachProfile = coach || null;
    }

    return {
      ...account,
      coachProfile,
    };
  }),

  // Refresh access token
  refreshToken: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify refresh token
      const payload = await verifyRefreshToken(input.refreshToken);
      if (!payload) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired refresh token',
        });
      }

      // Check if token exists in database and is not expired
      const [storedToken] = await ctx.db
        .select()
        .from(refreshTokens)
        .where(
          and(eq(refreshTokens.token, input.refreshToken), gt(refreshTokens.expiresAt, new Date()))
        )
        .limit(1);

      if (!storedToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Refresh token has been revoked or expired',
        });
      }

      // Get account
      const [account] = await ctx.db
        .select()
        .from(accounts)
        .where(eq(accounts.id, payload.sub))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Account not found',
        });
      }

      // Generate new tokens
      const tokens = await generateTokens({
        accountId: account.id,
        email: account.email,
        role: account.role,
      });

      // Delete old refresh token and store new one
      await ctx.db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

      await ctx.db.insert(refreshTokens).values({
        accountId: account.id,
        token: tokens.refreshToken,
        expiresAt: tokens.refreshTokenExpiresAt,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    }),

  // Update password
  updatePassword: protectedProcedure
    .input(updatePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      // Get current account with password
      const [account] = await ctx.db
        .select()
        .from(accounts)
        .where(eq(accounts.id, ctx.user.id))
        .limit(1);

      if (!account || !account.passwordHash) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      // Verify current password
      const isValid = await verifyPassword(input.currentPassword, account.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Current password is incorrect',
        });
      }

      // Validate new password
      const validation = validatePassword(input.newPassword);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.errors.join(', '),
        });
      }

      // Hash and update password
      const newPasswordHash = await hashPassword(input.newPassword);
      await ctx.db
        .update(accounts)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, ctx.user.id));

      // Invalidate all refresh tokens (force re-login)
      await ctx.db.delete(refreshTokens).where(eq(refreshTokens.accountId, ctx.user.id));

      return { success: true };
    }),

  // Create account (admin only) - for coaches and other admins
  createAccount: adminProcedure.input(createAccountSchema).mutation(async ({ ctx, input }) => {
    // Validate password
    const validation = validatePassword(input.password);
    if (!validation.valid) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: validation.errors.join(', '),
      });
    }

    // Check if email already exists
    const [existing] = await ctx.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, input.email.toLowerCase()))
      .limit(1);

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create account
    const insertResult = await ctx.db
      .insert(accounts)
      .values({
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role as Role,
      })
      .returning();

    const account = insertResult[0];
    if (!account) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create account',
      });
    }

    // If coach role, create coach profile
    if (input.role === 'COACH') {
      await ctx.db.insert(coaches).values({
        accountId: account.id,
        name: input.name,
      });
    }

    return {
      id: account.id,
      email: account.email,
      role: account.role,
    };
  }),
});
