// Main server entry point - Hono + tRPC + Socket.io

import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { createAdaptorServer } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { checkDatabaseConnection, closeDatabaseConnection } from './db';
import { checkRedisConnection, closeRedisConnection, initRedis } from './lib/redis';
import { rateLimiter } from './middleware/rate-limit';
import { appRouter } from './routers/_app';
import { initSocketServer } from './socket';
import { createContext } from './trpc';

const app = new Hono();

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  })
);

// Request logging
app.use('*', logger());

// Rate limiting
app.use('*', rateLimiter);

// Health check endpoint
app.get('/health', async (c) => {
  const dbHealthy = await checkDatabaseConnection();
  const redisHealthy = await checkRedisConnection();

  const status = dbHealthy && redisHealthy ? 'healthy' : 'unhealthy';
  const statusCode = status === 'healthy' ? 200 : 503;

  return c.json(
    {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
    },
    statusCode
  );
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'ICA Operations Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      trpc: '/trpc/*',
      upload: '/upload',
    },
  });
});

// Static files for uploads
app.use('/uploads/*', serveStatic({ root: './' }));

// Upload endpoint
app.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (file && file instanceof File) {
      const buffer = await file.arrayBuffer();
      // Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${safeName}`;
      const uploadDir = './uploads';

      // Ensure directory exists
      await mkdir(uploadDir, { recursive: true });

      // Write file
      await writeFile(join(uploadDir, fileName), new Uint8Array(buffer));

      // Construct full URL
      const protocol = c.req.header('x-forwarded-proto') || 'http';
      const host = c.req.header('host');
      const url = `${protocol}://${host}/uploads/${fileName}`;

      return c.json({
        success: true,
        url,
        filename: fileName,
        originalName: file.name,
      });
    }
    return c.json({ error: 'No valid file uploaded' }, 400);
  } catch (err) {
    console.error('Upload error:', err);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

// tRPC endpoint
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: async (_opts, c) => {
      console.error('Creating tRPC Context...');
      return await createContext(c);
    },
    onError: ({ error }) => {
      // Log errors on server
      console.error('tRPC Error:', error.message);

      // Remove stack trace in production
      if (process.env.NODE_ENV !== 'development') {
        error.stack = undefined;
      }
    },
  })
);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

// Server configuration
const port = Number(process.env.PORT) || 3001;

// Graceful shutdown handler
async function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  await closeDatabaseConnection();
  await closeRedisConnection();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
async function start() {
  try {
    // Initialize Redis connection
    console.log('📦 Connecting to Redis...');
    await initRedis();

    // Check database connection
    console.log('🗄️  Connecting to PostgreSQL...');
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }
    console.log('🗄️  PostgreSQL connected');

    // Create HTTP server with @hono/node-server adaptor
    const httpServer = createAdaptorServer({
      fetch: app.fetch,
      createServer,
    });

    // Initialize Socket.io on the HTTP server
    initSocketServer(httpServer);

    // Start listening
    httpServer.listen(port, () => {
      console.log(`\n🚀 Server is running on http://localhost:${port}`);
      console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);
      console.log(`🔌 WebSocket endpoint: ws://localhost:${port}`);
      console.log(`💚 Health check: http://localhost:${port}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Export types for client
export type { AppRouter } from './routers/_app';
export type {
  ChatMessage,
  ClientToServerEvents,
  Notification,
  PresenceUpdate,
  ServerToClientEvents,
} from './socket/types';
