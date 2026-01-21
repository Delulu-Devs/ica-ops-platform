// Auth Router - handles authentication and user management

import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { accounts, coaches, passwordResets, type Role, refreshTokens } from '../db/schema';
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
  bio: z.string().optional(),
  rating: z.number().optional(),
  specializations: z.array(z.string()).optional(),
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

  // Forgot Password
  forgotPassword: rateLimitedProcedure
    .input(z.object({ email: z.email() }))
    .mutation(async ({ ctx, input }) => {
      const [account] = await ctx.db
        .select()
        .from(accounts)
        .where(eq(accounts.email, input.email.toLowerCase()))
        .limit(1);

      if (account) {
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

        await ctx.db.insert(passwordResets).values({
          accountId: account.id,
          token,
          expiresAt,
        });

        // Mock Send Email
        console.log('------------------------------------------------');
        console.log(`[Email Service] Password Reset for ${input.email}`);
        console.log(`Link: http://localhost:3000/reset-password?token=${token}`);
        console.log('------------------------------------------------');
      }

      return {
        success: true,
        message: 'If an account exists, a reset email has been sent.',
      };
    }),

  // Reset Password
  resetPassword: rateLimitedProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8, { error: 'Password must be at least 8 characters' }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const validation = validatePassword(input.newPassword);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.errors.join(', '),
        });
      }

      const [resetRecord] = await ctx.db
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.token, input.token))
        .limit(1);

      if (!resetRecord || resetRecord.used || new Date() > resetRecord.expiresAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired reset token',
        });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await ctx.db
        .update(accounts)
        .set({ passwordHash })
        .where(eq(accounts.id, resetRecord.accountId));

      await ctx.db
        .update(passwordResets)
        .set({ used: true })
        .where(eq(passwordResets.id, resetRecord.id));

      await ctx.db.delete(refreshTokens).where(eq(refreshTokens.accountId, resetRecord.accountId));

      return { success: true };
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
        displayName: accounts.displayName,
        avatarSeed: accounts.avatarSeed,
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

      // Invalidate all existing refresh tokens (invalidates other sessions)
      await ctx.db.delete(refreshTokens).where(eq(refreshTokens.accountId, ctx.user.id));

      // Generate new tokens for current session
      const tokens = await generateTokens({
        accountId: account.id,
        email: account.email,
        role: account.role,
      });

      // Store new refresh token
      await ctx.db.insert(refreshTokens).values({
        accountId: account.id,
        token: tokens.refreshToken,
        expiresAt: tokens.refreshTokenExpiresAt,
      });

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(255).optional(),
        avatarSeed: z.string().max(255).optional(),
        bio: z.string().max(1000).optional(), // For coaches only
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update account fields
      await ctx.db
        .update(accounts)
        .set({
          displayName: input.displayName,
          avatarSeed: input.avatarSeed,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, ctx.user.id));

      // If coach, also update coach profile
      if (ctx.user.role === 'COACH' && (input.displayName || input.bio !== undefined)) {
        const updateFields: { name?: string; bio?: string; updatedAt: Date } = {
          updatedAt: new Date(),
        };
        if (input.displayName) updateFields.name = input.displayName;
        if (input.bio !== undefined) updateFields.bio = input.bio;

        await ctx.db.update(coaches).set(updateFields).where(eq(coaches.accountId, ctx.user.id));
      }

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
        bio: input.bio,
        rating: input.rating,
        specializations: input.specializations,
      });
    }

    return {
      id: account.id,
      email: account.email,
      role: account.role,
    };
  }),
});
