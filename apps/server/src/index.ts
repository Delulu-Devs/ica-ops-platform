import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
    '*',
    cors({
        origin: ['http://localhost:3000'],
        credentials: true,
    })
);

// Health check
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Add tRPC router
// import { trpcServer } from '@hono/trpc-server';
// import { appRouter } from './routers/_app';
// app.use('/trpc/*', trpcServer({ router: appRouter }));

const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Server is running on http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port,
});

export default app;
