/**
 * Quick Health Check Script
 *
 * Run this before the full test suite to verify:
 * - Server is running
 * - Database is connected
 * - Redis is connected
 * - Seed data exists
 *
 * Usage: bun run src/test/health-check.ts
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

async function main() {
  console.log("\n🏥 ICA Backend Health Check\n");
  console.log(`Target: ${BASE_URL}\n`);

  let allGood = true;

  // 1. Check server is running
  process.stdout.write("1. Server reachable... ");
  try {
    const response = await fetch(`${BASE_URL}/`);
    if (response.ok) {
      console.log("✅ OK");
    } else {
      console.log(`❌ HTTP ${response.status}`);
      allGood = false;
    }
  } catch {
    console.log("❌ Connection refused");
    console.log("\n   ⚠️  Start the server with: bun run dev\n");
    process.exit(1);
  }

  // 2. Check health endpoint
  process.stdout.write("2. Health endpoint... ");
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();

    if (data.status === "healthy") {
      console.log("✅ Healthy");
    } else {
      console.log(`⚠️  ${data.status}`);
      allGood = false;
    }

    // 2a. Database
    process.stdout.write("   - Database... ");
    if (data.services?.database === "connected") {
      console.log("✅ Connected");
    } else {
      console.log("❌ Disconnected");
      allGood = false;
    }

    // 2b. Redis
    process.stdout.write("   - Redis... ");
    if (data.services?.redis === "connected") {
      console.log("✅ Connected");
    } else {
      console.log("❌ Disconnected");
      allGood = false;
    }
  } catch (err) {
    console.log(`❌ Error: ${err}`);
    allGood = false;
  }

  // 3. Check seed data exists
  process.stdout.write("3. Seed data... ");
  try {
    const response = await fetch(`${BASE_URL}/trpc/auth.login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@ica.com", password: "Admin123!" }),
    });
    const data = await response.json();

    if (data.result?.data?.accessToken) {
      console.log("✅ Admin account exists");
    } else {
      console.log("⚠️  Admin login failed");
      console.log("\n   ⚠️  Run seed: bun run db:seed\n");
      allGood = false;
    }
  } catch (err) {
    console.log(`❌ Error: ${err}`);
    allGood = false;
  }

  // 4. Check tRPC is working
  process.stdout.write("4. tRPC endpoint... ");
  try {
    // Login first
    const loginRes = await fetch(`${BASE_URL}/trpc/auth.login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@ica.com", password: "Admin123!" }),
    });
    const loginData = await loginRes.json();
    const token = loginData.result?.data?.accessToken;

    if (token) {
      // Try a protected route
      const meRes = await fetch(`${BASE_URL}/trpc/auth.me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();

      if (meData.result?.data?.email) {
        console.log("✅ Working");
      } else {
        console.log("⚠️  Auth issues");
        allGood = false;
      }
    } else {
      console.log("⚠️  Could not get token");
      allGood = false;
    }
  } catch (err) {
    console.log(`❌ Error: ${err}`);
    allGood = false;
  }

  // Summary
  console.log("\n" + "─".repeat(40));
  if (allGood) {
    console.log("✅ All checks passed! Ready to run tests.\n");
    console.log("   Run: bun run test\n");
    process.exit(0);
  } else {
    console.log("⚠️  Some checks failed. Fix issues before testing.\n");
    process.exit(1);
  }
}

main().catch(console.error);
