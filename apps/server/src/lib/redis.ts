// Redis client for caching, sessions, and pub/sub
import { createClient, type RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

// Initialize Redis client
export async function initRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  redisClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000, // 10 seconds - gives Docker/Redis time to start
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error("❌ Max Redis reconnection attempts reached");
          return new Error("Max Redis reconnection attempts reached");
        }
        // Wait longer between retries: 500ms, 1s, 1.5s, 2s, etc.
        const delay = Math.min(retries * 500, 3000);
        console.log(
          `📦 Redis reconnecting in ${delay}ms... (attempt ${retries}/10)`,
        );
        return delay;
      },
    },
  });

  // Track if this is the first connection attempt
  let isFirstConnection = true;

  redisClient.on("error", (err) => {
    // Only log detailed errors after first successful connection or after multiple failures
    if (!isFirstConnection) {
      console.error("❌ Redis Client Error:", err.message);
    }
  });

  redisClient.on("connect", () => {
    isFirstConnection = false;
    console.log("📦 Redis connected");
  });

  await redisClient.connect();

  return redisClient;
}

// Get Redis client (creates if not exists)
export async function getRedis(): Promise<RedisClientType> {
  if (!redisClient || !redisClient.isOpen) {
    return await initRedis();
  }
  return redisClient;
}

// Cache utilities
export const cache = {
  // Set a value with optional expiration (in seconds)
  async set(
    key: string,
    value: unknown,
    expirationSeconds?: number,
  ): Promise<void> {
    const redis = await getRedis();
    const stringValue = JSON.stringify(value);

    if (expirationSeconds) {
      await redis.setEx(key, expirationSeconds, stringValue);
    } else {
      await redis.set(key, stringValue);
    }
  },

  // Get a value
  async get<T>(key: string): Promise<T | null> {
    const redis = await getRedis();
    const value = await redis.get(key);

    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  // Delete a key
  async del(key: string): Promise<void> {
    const redis = await getRedis();
    await redis.del(key);
  },

  // Delete keys by pattern
  async delByPattern(pattern: string): Promise<void> {
    const redis = await getRedis();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const redis = await getRedis();
    const result = await redis.exists(key);
    return result === 1;
  },

  // Set expiration on existing key
  async expire(key: string, seconds: number): Promise<void> {
    const redis = await getRedis();
    await redis.expire(key, seconds);
  },

  // Increment a counter
  async incr(key: string): Promise<number> {
    const redis = await getRedis();
    return await redis.incr(key);
  },

  // Get TTL of a key
  async ttl(key: string): Promise<number> {
    const redis = await getRedis();
    return await redis.ttl(key);
  },
};

// Session store utilities
export const sessionStore = {
  // Create a session
  async create(
    sessionId: string,
    data: Record<string, unknown>,
    expirationSeconds = 86400, // 24 hours default
  ): Promise<void> {
    await cache.set(`session:${sessionId}`, data, expirationSeconds);
  },

  // Get session data
  async get(sessionId: string): Promise<Record<string, unknown> | null> {
    return await cache.get<Record<string, unknown>>(`session:${sessionId}`);
  },

  // Update session
  async update(
    sessionId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const ttl = await cache.ttl(`session:${sessionId}`);
    if (ttl > 0) {
      await cache.set(`session:${sessionId}`, data, ttl);
    }
  },

  // Destroy session
  async destroy(sessionId: string): Promise<void> {
    await cache.del(`session:${sessionId}`);
  },

  // Extend session
  async extend(sessionId: string, additionalSeconds: number): Promise<void> {
    const redis = await getRedis();
    const currentTtl = await redis.ttl(`session:${sessionId}`);
    if (currentTtl > 0) {
      await redis.expire(
        `session:${sessionId}`,
        currentTtl + additionalSeconds,
      );
    }
  },
};

// Rate limiting utilities
export const rateLimiter = {
  // Check if request is rate limited
  async isLimited(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ limited: boolean; remaining: number; resetIn: number }> {
    const redis = await getRedis();
    const rateLimitKey = `ratelimit:${key}`;

    const current = await redis.incr(rateLimitKey);

    // Set expiration on first request
    if (current === 1) {
      await redis.expire(rateLimitKey, windowSeconds);
    }

    const ttl = await redis.ttl(rateLimitKey);
    const remaining = Math.max(0, limit - current);

    return {
      limited: current > limit,
      remaining,
      resetIn: ttl,
    };
  },

  // Reset rate limit for a key
  async reset(key: string): Promise<void> {
    await cache.del(`ratelimit:${key}`);
  },
};

// Pub/Sub for real-time updates
export const pubsub = {
  // Publish a message
  async publish(channel: string, message: unknown): Promise<void> {
    const redis = await getRedis();
    await redis.publish(channel, JSON.stringify(message));
  },

  // Subscribe to a channel (returns unsubscribe function)
  async subscribe(
    channel: string,
    callback: (message: unknown) => void,
  ): Promise<() => Promise<void>> {
    const redis = await getRedis();
    const subscriber = redis.duplicate();
    await subscriber.connect();

    await subscriber.subscribe(channel, (message) => {
      try {
        const parsed = JSON.parse(message);
        callback(parsed);
      } catch {
        callback(message);
      }
    });

    return async () => {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    };
  },
};

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    redisClient = null;
    console.log("📦 Redis connection closed");
  }
}

// Health check
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const redis = await getRedis();
    const pong = await redis.ping();
    return pong === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}
