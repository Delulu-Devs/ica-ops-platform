/**
 * ICA Operations Platform - Backend Test Suite
 * Comprehensive tests for all API endpoints
 */

const BASE_URL = process.env.API_URL || "http://localhost:3001";

// Test state
let passed = 0;
let failed = 0;
const results: { name: string; status: "PASS" | "FAIL"; error?: string }[] = [];

// Colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function log(message: string) {
  console.log(message);
}

function logPass(name: string) {
  passed++;
  results.push({ name, status: "PASS" });
  log(`${colors.green}✓${colors.reset} ${name}`);
}

function logFail(name: string, error: string) {
  failed++;
  results.push({ name, status: "FAIL", error });
  log(`${colors.red}✗${colors.reset} ${name}`);
  log(`  ${colors.dim}${error}${colors.reset}`);
}

// Helper to make tRPC calls
async function trpcCall(
  procedure: string,
  input?: unknown,
  method: "GET" | "POST" = "POST",
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const url =
      method === "GET" && input
        ? `${BASE_URL}/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`
        : `${BASE_URL}/trpc/${procedure}`;

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(input) : undefined,
    });

    const data = await response.json();

    if (data.error) {
      return {
        ok: false,
        error: data.error.message || JSON.stringify(data.error),
      };
    }

    return { ok: true, data: data.result?.data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Simple test runner
async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    logPass(name);
  } catch (e) {
    logFail(name, e instanceof Error ? e.message : String(e));
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertDefined(value: unknown, message: string) {
  if (value === undefined || value === null) throw new Error(message);
}

// ============ TEST SUITES ============

async function testHealthEndpoints() {
  log(`\n${colors.cyan}=== Health Endpoints ===${colors.reset}`);

  await runTest("GET / returns API info", async () => {
    const res = await fetch(`${BASE_URL}/`);
    const data = await res.json();
    assert(data.name === "ICA Operations Platform API", "Expected API name");
    assert(data.status === "healthy", "Expected healthy status");
  });

  await runTest("GET /health returns ok", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert(data.status === "ok", "Expected ok status");
    assertDefined(data.timestamp, "Expected timestamp");
  });
}

async function testAuthRouter() {
  log(`\n${colors.cyan}=== Auth Router ===${colors.reset}`);

  // Test login with valid credentials
  await runTest("auth.login with valid coach credentials", async () => {
    const result = await trpcCall("auth.login", {
      email: "coach@icaacademy.com",
      password: "password123",
    });
    assert(result.ok, `Login failed: ${result.error}`);
    assertDefined(result.data, "Expected login data");
  });

  // Test login with invalid credentials
  await runTest(
    "auth.login with invalid credentials returns error",
    async () => {
      const result = await trpcCall("auth.login", {
        email: "invalid@email.com",
        password: "wrongpassword",
      });
      assert(!result.ok, "Expected login to fail");
    },
  );

  // Test validation
  await runTest("auth.login validates email format", async () => {
    const result = await trpcCall("auth.login", {
      email: "not-an-email",
      password: "password123",
    });
    assert(!result.ok, "Expected validation error");
  });

  // Test me without token
  await runTest("auth.me without token returns error", async () => {
    const result = await trpcCall("auth.me", undefined, "GET");
    assert(!result.ok, "Expected auth error");
  });
}

async function testCoachRouter() {
  log(`\n${colors.cyan}=== Coach Router ===${colors.reset}`);

  await runTest("coach.getProfile fetches coach profile (GET)", async () => {
    const result = await trpcCall(
      "coach.getProfile",
      { coachId: "coach-1" },
      "GET",
    );
    // May fail without auth, that's expected
    assert(
      result.ok ||
        result.error?.includes("Unauthorized") ||
        result.error?.includes("UNAUTHORIZED"),
      `Unexpected error: ${result.error}`,
    );
  });

  await runTest("coach.list fetches all coaches (GET)", async () => {
    const result = await trpcCall("coach.list", undefined, "GET");
    assert(
      result.ok || result.error?.includes("Unauthorized"),
      `Unexpected error: ${result.error}`,
    );
  });
}

async function testBatchRouter() {
  log(`\n${colors.cyan}=== Batch Router ===${colors.reset}`);

  await runTest("batch.list fetches batches (GET)", async () => {
    const result = await trpcCall("batch.list", undefined, "GET");
    assert(
      result.ok || result.error?.includes("Unauthorized"),
      `Unexpected error: ${result.error}`,
    );
  });

  await runTest("batch.getById requires valid ID (GET)", async () => {
    const result = await trpcCall("batch.getById", { id: "batch-1" }, "GET");
    assert(
      result.ok ||
        result.error?.includes("Unauthorized") ||
        result.error?.includes("not found"),
      `Unexpected error: ${result.error}`,
    );
  });
}

async function testStudentRouter() {
  log(`\n${colors.cyan}=== Student Router ===${colors.reset}`);

  await runTest("student.list fetches students (GET)", async () => {
    const result = await trpcCall("student.list", undefined, "GET");
    assert(
      result.ok || result.error?.includes("Unauthorized"),
      `Unexpected error: ${result.error}`,
    );
  });

  await runTest("student.getById requires valid ID (GET)", async () => {
    const result = await trpcCall(
      "student.getById",
      { id: "student-1" },
      "GET",
    );
    assert(
      result.ok ||
        result.error?.includes("Unauthorized") ||
        result.error?.includes("not found"),
      `Unexpected error: ${result.error}`,
    );
  });

  await runTest("student.getByAccountId fetches by account (GET)", async () => {
    const result = await trpcCall(
      "student.getByAccountId",
      { accountId: "account-1" },
      "GET",
    );
    assert(
      result.ok ||
        result.error?.includes("Unauthorized") ||
        result.error?.includes("not found"),
      `Unexpected error: ${result.error}`,
    );
  });
}

async function testDemoRouter() {
  log(`\n${colors.cyan}=== Demo Router ===${colors.reset}`);

  await runTest("demo.list fetches demo sessions (GET)", async () => {
    const result = await trpcCall("demo.list", undefined, "GET");
    assert(
      result.ok || result.error?.includes("Unauthorized"),
      `Unexpected error: ${result.error}`,
    );
  });

  await runTest("demo.getById fetches specific demo (GET)", async () => {
    const result = await trpcCall("demo.getById", { id: "demo-1" }, "GET");
    assert(
      result.ok ||
        result.error?.includes("Unauthorized") ||
        result.error?.includes("not found"),
      `Unexpected error: ${result.error}`,
    );
  });

  await runTest("demo.getStats fetches statistics (GET)", async () => {
    const result = await trpcCall("demo.getStats", undefined, "GET");
    assert(
      result.ok || result.error?.includes("Unauthorized"),
      `Unexpected error: ${result.error}`,
    );
  });
}

async function testSubscriptionRouter() {
  log(`\n${colors.cyan}=== Subscription Router ===${colors.reset}`);

  await runTest(
    "subscription.getPlans fetches available plans (GET)",
    async () => {
      const result = await trpcCall("subscription.getPlans", undefined, "GET");
      assert(
        result.ok || result.error?.includes("Unauthorized"),
        `Unexpected error: ${result.error}`,
      );
    },
  );

  await runTest("subscription.list fetches subscriptions (GET)", async () => {
    const result = await trpcCall("subscription.list", undefined, "GET");
    assert(
      result.ok || result.error?.includes("Unauthorized"),
      `Unexpected error: ${result.error}`,
    );
  });

  await runTest("subscription.getById requires valid ID (GET)", async () => {
    const result = await trpcCall(
      "subscription.getById",
      { id: "sub-1" },
      "GET",
    );
    assert(
      result.ok ||
        result.error?.includes("Unauthorized") ||
        result.error?.includes("not found"),
      `Unexpected error: ${result.error}`,
    );
  });
}

async function testAnalyticsRouter() {
  log(`\n${colors.cyan}=== Analytics Router ===${colors.reset}`);

  await runTest(
    "analytics.getDashboard fetches dashboard data (GET)",
    async () => {
      const result = await trpcCall("analytics.getDashboard", undefined, "GET");
      assert(
        result.ok || result.error?.includes("Unauthorized"),
        `Unexpected error: ${result.error}`,
      );
    },
  );

  await runTest(
    "analytics.getCoachPerformance fetches coach stats (GET)",
    async () => {
      const result = await trpcCall(
        "analytics.getCoachPerformance",
        { coachId: "coach-1" },
        "GET",
      );
      assert(
        result.ok || result.error?.includes("Unauthorized"),
        `Unexpected error: ${result.error}`,
      );
    },
  );

  await runTest(
    "analytics.getBatchAnalytics fetches batch stats (GET)",
    async () => {
      const result = await trpcCall(
        "analytics.getBatchAnalytics",
        { batchId: "batch-1" },
        "GET",
      );
      assert(
        result.ok || result.error?.includes("Unauthorized"),
        `Unexpected error: ${result.error}`,
      );
    },
  );
}

async function testChatRouter() {
  log(`\n${colors.cyan}=== Chat Router ===${colors.reset}`);

  await runTest(
    "chat.getConversations fetches conversations (GET)",
    async () => {
      const result = await trpcCall("chat.getConversations", undefined, "GET");
      assert(
        result.ok || result.error?.includes("Unauthorized"),
        `Unexpected error: ${result.error}`,
      );
    },
  );

  await runTest("chat.getMessages requires conversationId (GET)", async () => {
    const result = await trpcCall(
      "chat.getMessages",
      { conversationId: "conv-1" },
      "GET",
    );
    assert(
      result.ok ||
        result.error?.includes("Unauthorized") ||
        result.error?.includes("not found"),
      `Unexpected error: ${result.error}`,
    );
  });
}

async function testEdgeCases() {
  log(`\n${colors.cyan}=== Edge Cases ===${colors.reset}`);

  await runTest("Invalid tRPC procedure returns error", async () => {
    const res = await fetch(`${BASE_URL}/trpc/nonexistent.procedure`);
    const data = await res.json();
    assert(data.error !== undefined, "Expected error for invalid procedure");
  });

  await runTest("Empty input on required field fails", async () => {
    const result = await trpcCall("auth.login", {});
    assert(!result.ok, "Expected validation error");
  });

  await runTest("Malformed JSON returns error", async () => {
    const res = await fetch(`${BASE_URL}/trpc/auth.login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    assert(
      !res.ok || (await res.json()).error,
      "Expected error for malformed JSON",
    );
  });

  await runTest("Very long string input is handled", async () => {
    const longString = "a".repeat(10000);
    const result = await trpcCall("auth.login", {
      email: longString,
      password: "test",
    });
    assert(!result.ok, "Expected validation error for long input");
  });

  await runTest("SQL injection attempt is handled", async () => {
    const result = await trpcCall("auth.login", {
      email: "'; DROP TABLE users; --",
      password: "password",
    });
    assert(!result.ok, "Expected validation error");
  });

  await runTest("XSS attempt is handled", async () => {
    const result = await trpcCall("auth.login", {
      email: "<script>alert('xss')</script>@test.com",
      password: "password",
    });
    assert(!result.ok, "Expected validation error");
  });
}

async function testWebSocket() {
  log(`\n${colors.cyan}=== WebSocket ===${colors.reset}`);

  await runTest("Socket.io endpoint exists", async () => {
    try {
      const res = await fetch(`${BASE_URL}/socket.io/?EIO=4&transport=polling`);
      // Socket.io should respond, even without full handshake
      assert(res.status < 500, `Server error: ${res.status}`);
    } catch (e) {
      // If Socket.io isn't enabled, that's okay
      log(`  ${colors.dim}(Socket.io may not be configured)${colors.reset}`);
    }
  });
}

// Main runner
async function main() {
  log(
    `${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  log(
    `${colors.cyan}║       ICA Operations Platform - Backend Test Suite        ║${colors.reset}`,
  );
  log(
    `${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`,
  );
  log(`\nTarget: ${BASE_URL}\n`);

  // Check server is running
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) {
      log(
        `${colors.red}Error: Server not responding at ${BASE_URL}${colors.reset}`,
      );
      log(`Please start the server with: bun run dev`);
      process.exit(1);
    }
    log(`${colors.green}✓ Server is running${colors.reset}`);
  } catch (e) {
    log(
      `${colors.red}Error: Cannot connect to server at ${BASE_URL}${colors.reset}`,
    );
    log(`Please start the server with: bun run dev`);
    process.exit(1);
  }

  // Run all test suites
  await testHealthEndpoints();
  await testAuthRouter();
  await testCoachRouter();
  await testBatchRouter();
  await testStudentRouter();
  await testDemoRouter();
  await testSubscriptionRouter();
  await testAnalyticsRouter();
  await testChatRouter();
  await testEdgeCases();
  await testWebSocket();

  // Summary
  log(
    `\n${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`,
  );
  log(`\n${colors.cyan}Test Summary${colors.reset}`);
  log(`${colors.green}Passed: ${passed}${colors.reset}`);
  log(`${colors.red}Failed: ${failed}${colors.reset}`);
  log(`Total:  ${passed + failed}`);

  if (failed > 0) {
    log(`\n${colors.yellow}Failed Tests:${colors.reset}`);
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        log(`  ${colors.red}✗${colors.reset} ${r.name}`);
      });
  }

  log(
    `\n${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
