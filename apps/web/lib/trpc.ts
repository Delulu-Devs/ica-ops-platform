import type { AppRouter } from '@ica/server/src/index';
import { type CreateTRPCReact, createTRPCReact } from '@trpc/react-query';

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
