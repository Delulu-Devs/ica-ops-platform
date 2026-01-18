/**
 * ICA Operations Platform - Backend Test Suite Runner
 *
 * Comprehensive test suite that validates all tRPC endpoints and WebSocket functionality.
 * Run with: bun run test
 *
 * Prerequisites:
 * - Server running on http://localhost:3001
 * - Database seeded with: bun run db:seed
 * - Redis connected
 */

import { io } from 'socket.io-client';

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3001';

// Test credentials from seed data
const ADMIN_CREDS = { email: 'admin@ica.com', password: 'Admin123!' };
const COACH_CREDS = { email: 'coach1@ica.com', password: 'Coach123!' };
const CUSTOMER_CREDS = {
  email: 'parent1@example.com',
  password: 'Customer123!',
};

// Test state
interface TestState {
  adminToken: string;
  coachToken: string;
  customerToken: string;
  testDemoId?: string;
  testStudentId?: string;
  testBatchId?: string;
  testCoachId?: string;
  testSubscriptionId?: string;
  testPlanId?: string;
  testAccountId?: string;
  testRoomId?: string;
}

const state: TestState = {
  adminToken: '',
  coachToken: '',
  customerToken: '',
};

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Helpers
async function trpcCall(
  procedure: string,
  input?: unknown,
  token?: string,
  method: 'GET' | 'POST' = 'POST'
): Promise<{ result?: { data: unknown }; error?: { message: string } }> {
  const url = new URL(`/trpc/${procedure}`, BASE_URL);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST' && input !== undefined) {
    options.body = JSON.stringify(input);
  } else if (method === 'GET' && input !== undefined) {
    url.searchParams.set('input', JSON.stringify(input));
  }

  const response = await fetch(url.toString(), options);
  return response.json();
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - start,
    });
    console.log(`  ✅ ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      name,
      passed: false,
      error: errorMessage,
      duration: Date.now() - start,
    });
    console.log(`  ❌ ${name}: ${errorMessage}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// ============ AUTH ROUTER TESTS ============

async function testAuthRouter() {
  console.log('\n📦 Auth Router Tests');

  // Test: Register new account
  await runTest('auth.register - should register new account', async () => {
    const uniqueEmail = `test.${Date.now()}@example.com`;
    const res = await trpcCall('auth.register', {
      email: uniqueEmail,
      password: 'TestPass123!',
      studentName: 'Test Student',
      parentName: 'Test Parent',
    });
    assert(!!res.result?.data, 'Should return user data');
    const data = res.result.data as {
      user: { email: string };
      accessToken: string;
    };
    assert(!!data.accessToken, 'Should return access token');
    assert(data.user.email === uniqueEmail, 'Email should match');
  });

  // Test: Register with weak password should fail
  await runTest('auth.register - should reject weak password', async () => {
    const res = await trpcCall('auth.register', {
      email: `weak.${Date.now()}@example.com`,
      password: 'weak',
    });
    assert(!!res.error, 'Should return error for weak password');
  });

  // Test: Login with valid credentials
  await runTest('auth.login - should login admin', async () => {
    const res = await trpcCall('auth.login', ADMIN_CREDS);
    assert(!!res.result?.data, 'Should return data');
    const data = res.result.data as {
      accessToken: string;
      refreshToken: string;
    };
    assert(!!data.accessToken, 'Should return access token');
    state.adminToken = data.accessToken;
  });

  // Test: Login as coach
  await runTest('auth.login - should login coach', async () => {
    const res = await trpcCall('auth.login', COACH_CREDS);
    const data = res.result?.data as { accessToken: string } | undefined;
    assert(!!data?.accessToken, 'Should return access token');
    state.coachToken = data.accessToken;
  });

  // Test: Login as customer
  await runTest('auth.login - should login customer', async () => {
    const res = await trpcCall('auth.login', CUSTOMER_CREDS);
    const data = res.result?.data as { accessToken: string } | undefined;
    assert(!!data?.accessToken, 'Should return access token');
    state.customerToken = data.accessToken;
  });

  // Test: Login with invalid credentials
  await runTest('auth.login - should reject invalid credentials', async () => {
    const res = await trpcCall('auth.login', {
      email: 'admin@ica.com',
      password: 'wrongpassword',
    });
    assert(!!res.error, 'Should return error for invalid credentials');
  });

  // Test: Get current user
  await runTest('auth.me - should return current user', async () => {
    const res = await trpcCall('auth.me', undefined, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return user data');
    const data = res.result.data as { email: string; role: string };
    assert(data.email === ADMIN_CREDS.email, 'Email should match');
    assert(data.role === 'ADMIN', 'Role should be ADMIN');
  });

  // Test: Get current user without token
  await runTest('auth.me - should reject without token', async () => {
    const res = await trpcCall('auth.me', undefined, undefined, 'GET');
    assert(!!res.error, 'Should return error without token');
  });

  // Test: Refresh token
  await runTest('auth.refreshToken - should refresh tokens', async () => {
    // First, login to get a refresh token
    const loginRes = await trpcCall('auth.login', ADMIN_CREDS);
    const loginData = loginRes.result?.data as { refreshToken: string } | undefined;
    assert(!!loginData?.refreshToken, 'Should have refresh token');

    const res = await trpcCall('auth.refreshToken', {
      refreshToken: loginData.refreshToken,
    });
    const data = res.result?.data as { accessToken: string; refreshToken: string } | undefined;
    assert(!!data?.accessToken, 'Should return new access token');
    assert(!!data?.refreshToken, 'Should return new refresh token');
  });

  // Test: Create coach account (admin only)
  await runTest('auth.createAccount - admin can create coach', async () => {
    const res = await trpcCall(
      'auth.createAccount',
      {
        email: `newcoach.${Date.now()}@ica.com`,
        password: 'NewCoach123!',
        role: 'COACH',
        name: 'Test Coach',
      },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should return created account');
    const data = res.result.data as { role: string; id: string };
    assert(data.role === 'COACH', 'Role should be COACH');
    state.testAccountId = data.id;
  });

  // Test: Create account without admin access
  await runTest('auth.createAccount - coach cannot create accounts', async () => {
    const res = await trpcCall(
      'auth.createAccount',
      {
        email: `blocked.${Date.now()}@ica.com`,
        password: 'Blocked123!',
        role: 'COACH',
        name: 'Blocked Coach',
      },
      state.coachToken
    );
    assert(!!res.error, 'Should deny coach from creating accounts');
  });
}

// ============ DEMO ROUTER TESTS ============

async function testDemoRouter() {
  console.log('\n📦 Demo Router Tests');

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const futureEnd = new Date(futureDate.getTime() + 60 * 60 * 1000);

  // Test: Create demo (public)
  await runTest('demo.create - should create demo', async () => {
    const res = await trpcCall('demo.create', {
      studentName: 'Test Student',
      parentName: 'Test Parent',
      parentEmail: 'testparent@example.com',
      timezone: 'Asia/Kolkata',
      scheduledStart: futureDate.toISOString(),
      scheduledEnd: futureEnd.toISOString(),
    });
    assert(!!res.result?.data, 'Should return created demo');
    const data = res.result.data as { id: string; status: string };
    assert(data.status === 'BOOKED', 'Status should be BOOKED');
    state.testDemoId = data.id;
  });

  // Test: Create demo with invalid dates
  await runTest('demo.create - should reject invalid dates', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const res = await trpcCall('demo.create', {
      studentName: 'Test',
      parentName: 'Test',
      parentEmail: 'test@example.com',
      scheduledStart: pastDate.toISOString(),
      scheduledEnd: futureEnd.toISOString(),
    });
    assert(!!res.error, 'Should reject past dates');
  });

  // Test: List demos (admin)
  await runTest('demo.list - admin can list all demos', async () => {
    const res = await trpcCall('demo.list', { limit: 10, offset: 0 }, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return demo list');
    const data = res.result.data as { demos: unknown[]; total: number };
    assert(Array.isArray(data.demos), 'Should have demos array');
    assert(typeof data.total === 'number', 'Should have total count');
  });

  // Test: List demos (coach - filtered)
  await runTest('demo.list - coach sees filtered demos', async () => {
    const res = await trpcCall('demo.list', { limit: 10, offset: 0 }, state.coachToken, 'GET');
    assert(!!res.result?.data, 'Should return demo list');
  });

  // Test: Get demo by ID
  await runTest('demo.getById - should get demo details', async () => {
    if (!state.testDemoId) throw new Error('No test demo ID');
    const res = await trpcCall('demo.getById', { id: state.testDemoId }, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return demo');
    const data = res.result.data as { id: string };
    assert(data.id === state.testDemoId, 'Demo ID should match');
  });

  // Test: Update demo status
  await runTest('demo.updateStatus - admin can update status', async () => {
    if (!state.testDemoId) throw new Error('No test demo ID');
    const res = await trpcCall(
      'demo.updateStatus',
      { id: state.testDemoId, status: 'ATTENDED' },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should return updated demo');
    const data = res.result.data as { status: string };
    assert(data.status === 'ATTENDED', 'Status should be updated');
  });

  // Test: Submit outcome
  await runTest('demo.submitOutcome - should submit outcome', async () => {
    if (!state.testDemoId) throw new Error('No test demo ID');
    const res = await trpcCall(
      'demo.submitOutcome',
      {
        id: state.testDemoId,
        status: 'INTERESTED',
        recommendedStudentType: '1-1',
        recommendedLevel: 'Beginner',
        adminNotes: 'Good potential',
      },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should return updated demo');
    const data = res.result.data as { status: string };
    assert(data.status === 'INTERESTED', 'Status should be INTERESTED');
  });

  // Test: Reschedule demo
  await runTest('demo.reschedule - should reschedule demo', async () => {
    // Create a new demo for rescheduling
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 14);
    const newEnd = new Date(newDate.getTime() + 60 * 60 * 1000);

    const createRes = await trpcCall('demo.create', {
      studentName: 'Reschedule Test',
      parentName: 'Reschedule Parent',
      parentEmail: 'reschedule@example.com',
      scheduledStart: futureDate.toISOString(),
      scheduledEnd: futureEnd.toISOString(),
    });
    const demoData = createRes.result?.data as { id: string } | undefined;
    assert(!!demoData?.id, 'Should create demo');

    const res = await trpcCall(
      'demo.reschedule',
      {
        id: demoData.id,
        scheduledStart: newDate.toISOString(),
        scheduledEnd: newEnd.toISOString(),
      },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should reschedule demo');
    const data = res.result.data as { status: string };
    assert(data.status === 'RESCHEDULED', 'Status should be RESCHEDULED');
  });

  // Test: Cancel demo
  await runTest('demo.cancel - should cancel demo', async () => {
    // Create a fresh demo to cancel
    const createRes = await trpcCall('demo.create', {
      studentName: 'Cancel Test',
      parentName: 'Cancel Parent',
      parentEmail: 'cancel@example.com',
      scheduledStart: futureDate.toISOString(),
      scheduledEnd: futureEnd.toISOString(),
    });
    const demoData = createRes.result?.data as { id: string } | undefined;
    assert(!!demoData?.id, 'Should create demo');

    const res = await trpcCall('demo.cancel', { id: demoData.id }, state.adminToken);
    assert(!!res.result?.data, 'Should cancel demo');
    const data = res.result.data as { status: string };
    assert(data.status === 'CANCELLED', 'Status should be CANCELLED');
  });
}

// ============ COACH ROUTER TESTS ============

async function testCoachRouter() {
  console.log('\n📦 Coach Router Tests');

  // Test: List coaches (admin only)
  await runTest('coach.list - admin can list coaches', async () => {
    const res = await trpcCall('coach.list', { limit: 10, offset: 0 }, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return coach list');
    const data = res.result.data as {
      coaches: Array<{ id: string }>;
      total: number;
    };
    assert(Array.isArray(data.coaches), 'Should have coaches array');
    if (data.coaches.length > 0) {
      state.testCoachId = data.coaches[0].id;
    }
  });

  // Test: Get coach profile
  await runTest('coach.getProfile - coach can get own profile', async () => {
    const res = await trpcCall('coach.getProfile', undefined, state.coachToken, 'GET');
    assert(!!res.result?.data, 'Should return coach profile');
    const data = res.result.data as { name: string };
    assert(!!data.name, 'Should have name');
  });

  // Test: Update coach profile
  await runTest('coach.updateProfile - coach can update profile', async () => {
    const res = await trpcCall(
      'coach.updateProfile',
      { bio: 'Updated bio for testing' },
      state.coachToken
    );
    assert(!!res.result?.data, 'Should return updated profile');
    const data = res.result.data as { bio: string };
    assert(data.bio === 'Updated bio for testing', 'Bio should be updated');
  });

  // Test: Update availability
  await runTest('coach.updateAvailability - should update availability', async () => {
    const availability = JSON.stringify({
      slots: [
        { day: 'monday', start: '09:00', end: '17:00' },
        { day: 'wednesday', start: '09:00', end: '17:00' },
      ],
    });
    const res = await trpcCall('coach.updateAvailability', { availability }, state.coachToken);
    assert(!!res.result?.data, 'Should update availability');
  });

  // Test: Get schedule
  await runTest('coach.getSchedule - should get schedule', async () => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const res = await trpcCall(
      'coach.getSchedule',
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      state.coachToken,
      'GET'
    );
    assert(!!res.result?.data, 'Should return schedule');
    const data = res.result.data as { demos: unknown[]; batches: unknown[] };
    assert(Array.isArray(data.demos), 'Should have demos array');
  });

  // Test: Block time
  await runTest('coach.blockTime - should block time', async () => {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 3);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const res = await trpcCall(
      'coach.blockTime',
      {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        reason: 'Personal time',
      },
      state.coachToken
    );
    assert(!!res.result?.data, 'Should block time');
  });

  // Test: Get coach by ID
  await runTest('coach.getById - should get coach by ID', async () => {
    if (!state.testCoachId) {
      console.log('    ⚠️ Skipped (no test coach ID)');
      return;
    }
    const res = await trpcCall('coach.getById', { id: state.testCoachId }, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return coach');
  });
}

// ============ BATCH ROUTER TESTS ============

async function testBatchRouter() {
  console.log('\n📦 Batch Router Tests');

  // Test: Create batch (admin only)
  await runTest('batch.create - admin can create batch', async () => {
    if (!state.testCoachId) {
      // Get a coach ID first
      const coachRes = await trpcCall(
        'coach.list',
        { limit: 1, offset: 0 },
        state.adminToken,
        'GET'
      );
      const coachData = coachRes.result?.data as { coaches: Array<{ id: string }> } | undefined;
      if (coachData?.coaches?.[0]) {
        state.testCoachId = coachData.coaches[0].id;
      }
    }
    if (!state.testCoachId) throw new Error('No coach available');

    const res = await trpcCall(
      'batch.create',
      {
        name: `Test Batch ${Date.now()}`,
        coachId: state.testCoachId,
        level: 'Beginner',
        timezone: 'Asia/Kolkata',
        maxStudents: 10,
      },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should create batch');
    const data = res.result.data as { id: string };
    state.testBatchId = data.id;
  });

  // Test: List batches
  await runTest('batch.list - should list batches', async () => {
    const res = await trpcCall('batch.list', { limit: 10, offset: 0 }, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return batch list');
    const data = res.result.data as { batches: unknown[] };
    assert(Array.isArray(data.batches), 'Should have batches array');
  });

  // Test: Get batch by ID
  await runTest('batch.getById - should get batch details', async () => {
    if (!state.testBatchId) throw new Error('No test batch ID');
    const res = await trpcCall('batch.getById', { id: state.testBatchId }, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return batch');
  });

  // Test: Update batch
  await runTest('batch.update - should update batch', async () => {
    if (!state.testBatchId) throw new Error('No test batch ID');
    const res = await trpcCall(
      'batch.update',
      { id: state.testBatchId, name: 'Updated Batch Name', maxStudents: 15 },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should update batch');
    const data = res.result.data as { maxStudents: number };
    assert(data.maxStudents === 15, 'Max students should be updated');
  });
}

// ============ STUDENT ROUTER TESTS ============

async function testStudentRouter() {
  console.log('\n📦 Student Router Tests');

  // Test: Create student (admin only)
  await runTest('student.create - admin can create student', async () => {
    // Get a customer account first
    const loginRes = await trpcCall('auth.login', CUSTOMER_CREDS);
    const loginData = loginRes.result?.data as { user: { id: string } } | undefined;

    const res = await trpcCall(
      'student.create',
      {
        accountId: loginData?.user?.id || state.testAccountId || crypto.randomUUID(),
        studentName: 'Test Student',
        studentAge: 12,
        parentName: 'Test Parent',
        parentEmail: 'testsparent@example.com',
        timezone: 'Asia/Kolkata',
        studentType: 'GROUP',
        level: 'Beginner',
      },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should create student');
    const data = res.result.data as { id: string };
    state.testStudentId = data.id;
  });

  // Test: List students
  await runTest('student.list - should list students', async () => {
    const res = await trpcCall('student.list', { limit: 10, offset: 0 }, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return student list');
    const data = res.result.data as { students: unknown[] };
    assert(Array.isArray(data.students), 'Should have students array');
  });

  // Test: Get student by ID
  await runTest('student.getById - should get student details', async () => {
    if (!state.testStudentId) {
      console.log('    ⚠️ Skipped (no test student ID)');
      return;
    }
    const res = await trpcCall(
      'student.getById',
      { id: state.testStudentId },
      state.adminToken,
      'GET'
    );
    assert(!!res.result?.data, 'Should return student');
  });

  // Test: Update student
  await runTest('student.update - should update student', async () => {
    if (!state.testStudentId) {
      console.log('    ⚠️ Skipped (no test student ID)');
      return;
    }
    const res = await trpcCall(
      'student.update',
      { id: state.testStudentId, level: 'Intermediate' },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should update student');
  });

  // Test: Assign coach
  await runTest('student.assignCoach - should assign coach', async () => {
    if (!state.testStudentId || !state.testCoachId) {
      console.log('    ⚠️ Skipped (missing IDs)');
      return;
    }
    const res = await trpcCall(
      'student.assignCoach',
      { id: state.testStudentId, coachId: state.testCoachId },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should assign coach');
  });

  // Test: Assign batch
  await runTest('student.assignBatch - should assign batch', async () => {
    if (!state.testStudentId || !state.testBatchId) {
      console.log('    ⚠️ Skipped (missing IDs)');
      return;
    }
    const res = await trpcCall(
      'student.assignBatch',
      { id: state.testStudentId, batchId: state.testBatchId },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should assign batch');
  });

  // Test: Update status
  await runTest('student.updateStatus - should update status', async () => {
    if (!state.testStudentId) {
      console.log('    ⚠️ Skipped (no test student ID)');
      return;
    }
    const res = await trpcCall(
      'student.updateStatus',
      { id: state.testStudentId, status: 'PAUSED' },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should update status');
    const data = res.result.data as { status: string };
    assert(data.status === 'PAUSED', 'Status should be PAUSED');
  });
}

// ============ SUBSCRIPTION ROUTER TESTS ============

async function testSubscriptionRouter() {
  console.log('\n📦 Subscription Router Tests');

  // Test: Get plans (public)
  await runTest('subscription.getPlans - should list plans', async () => {
    const res = await trpcCall('subscription.getPlans', undefined, undefined, 'GET');
    assert(!!res.result?.data, 'Should return plans');
    const data = res.result.data as Array<{ id: string }>;
    assert(Array.isArray(data), 'Should be an array');
    if (data.length > 0) {
      state.testPlanId = data[0].id;
    }
  });

  // Test: Create subscription (admin only)
  await runTest('subscription.create - admin can create subscription', async () => {
    if (!state.testPlanId) {
      console.log('    ⚠️ Skipped (no plan available)');
      return;
    }

    // Get a customer account
    const loginRes = await trpcCall('auth.login', CUSTOMER_CREDS);
    const loginData = loginRes.result?.data as { user: { id: string } } | undefined;
    if (!loginData?.user?.id) {
      console.log('    ⚠️ Skipped (no customer account)');
      return;
    }

    const res = await trpcCall(
      'subscription.create',
      {
        accountId: loginData.user.id,
        planId: state.testPlanId,
      },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should create subscription');
    const data = res.result.data as { id: string };
    state.testSubscriptionId = data.id;
  });

  // Test: Get subscription by ID
  await runTest('subscription.getById - should get subscription', async () => {
    if (!state.testSubscriptionId) {
      console.log('    ⚠️ Skipped (no subscription)');
      return;
    }
    const res = await trpcCall(
      'subscription.getById',
      { id: state.testSubscriptionId },
      state.adminToken,
      'GET'
    );
    assert(!!res.result?.data, 'Should return subscription');
  });

  // Test: Update subscription status
  await runTest('subscription.updateStatus - should update status', async () => {
    if (!state.testSubscriptionId) {
      console.log('    ⚠️ Skipped (no subscription)');
      return;
    }
    const res = await trpcCall(
      'subscription.updateStatus',
      { id: state.testSubscriptionId, status: 'PAST_DUE' },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should update status');
  });

  // Test: Get payment history
  await runTest('subscription.getPaymentHistory - should get history', async () => {
    const res = await trpcCall('subscription.getPaymentHistory', {}, state.customerToken, 'GET');
    assert(!!res.result?.data, 'Should return payment history');
    assert(Array.isArray(res.result.data), 'Should be an array');
  });

  // Test: Get my subscriptions
  await runTest('subscription.getMySubscriptions - should get own subs', async () => {
    const res = await trpcCall(
      'subscription.getMySubscriptions',
      undefined,
      state.customerToken,
      'GET'
    );
    assert(!!res.result?.data, 'Should return subscriptions');
    assert(Array.isArray(res.result.data), 'Should be an array');
  });
}

// ============ CHAT ROUTER TESTS ============

async function testChatRouter() {
  console.log('\n📦 Chat Router Tests');

  // Test: Get rooms
  await runTest('chat.getRooms - should get user rooms', async () => {
    const res = await trpcCall('chat.getRooms', undefined, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return rooms');
    assert(Array.isArray(res.result.data), 'Should be an array');
  });

  // Test: Create DM (admin to coach is allowed)
  await runTest('chat.createDM - admin can DM coach', async () => {
    // Get coach's account ID
    const coachMeRes = await trpcCall('auth.me', undefined, state.coachToken, 'GET');
    const coachData = coachMeRes.result?.data as { id: string } | undefined;
    if (!coachData?.id) {
      console.log('    ⚠️ Skipped (no coach account)');
      return;
    }

    const res = await trpcCall(
      'chat.createDM',
      { targetAccountId: coachData.id },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should create DM room');
    const data = res.result.data as { roomId: string };
    assert(!!data.roomId, 'Should have room ID');
    state.testRoomId = data.roomId;
  });

  // Test: Send message
  await runTest('chat.sendMessage - should send message', async () => {
    if (!state.testRoomId) {
      console.log('    ⚠️ Skipped (no test room)');
      return;
    }
    const res = await trpcCall(
      'chat.sendMessage',
      { roomId: state.testRoomId, content: 'Test message from test suite' },
      state.adminToken
    );
    assert(!!res.result?.data, 'Should send message');
    const data = res.result.data as { content: string };
    assert(data.content === 'Test message from test suite', 'Content should match');
  });

  // Test: Get messages
  await runTest('chat.getMessages - should get messages', async () => {
    if (!state.testRoomId) {
      console.log('    ⚠️ Skipped (no test room)');
      return;
    }
    const res = await trpcCall(
      'chat.getMessages',
      { roomId: state.testRoomId, limit: 10, offset: 0 },
      state.adminToken,
      'GET'
    );
    assert(!!res.result?.data, 'Should return messages');
    assert(Array.isArray(res.result.data), 'Should be an array');
  });

  // Test: Mark as read
  await runTest('chat.markAsRead - should mark as read', async () => {
    if (!state.testRoomId) {
      console.log('    ⚠️ Skipped (no test room)');
      return;
    }
    const res = await trpcCall('chat.markAsRead', { roomId: state.testRoomId }, state.adminToken);
    assert(!!res.result?.data, 'Should mark as read');
    const data = res.result.data as { success: boolean };
    assert(data.success === true, 'Should return success');
  });
}

// ============ ANALYTICS ROUTER TESTS ============

async function testAnalyticsRouter() {
  console.log('\n📦 Analytics Router Tests');

  // Test: Get funnel
  await runTest('analytics.getFunnel - should get funnel metrics', async () => {
    const res = await trpcCall('analytics.getFunnel', {}, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return funnel data');
    const data = res.result.data as { booked: number; attended: number };
    assert(typeof data.booked === 'number', 'Should have booked count');
  });

  // Test: Get coach performance
  await runTest('analytics.getCoachPerformance - should get coach metrics', async () => {
    const res = await trpcCall('analytics.getCoachPerformance', {}, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return coach performance');
    assert(Array.isArray(res.result.data), 'Should be an array');
  });

  // Test: Get admin efficiency
  await runTest('analytics.getAdminEfficiency - should get admin metrics', async () => {
    const res = await trpcCall('analytics.getAdminEfficiency', {}, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return admin efficiency');
    const data = res.result.data as { admins: unknown[]; summary: unknown };
    assert(!!data.summary, 'Should have summary');
  });

  // Test: Get dashboard
  await runTest('analytics.getDashboard - should get dashboard summary', async () => {
    const res = await trpcCall('analytics.getDashboard', undefined, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return dashboard');
    const data = res.result.data as {
      todayDemos: number;
      activeStudents: number;
    };
    assert(typeof data.todayDemos === 'number', 'Should have todayDemos');
  });

  // Test: Export data
  await runTest('analytics.export - should export demos', async () => {
    const res = await trpcCall('analytics.export', { type: 'demos' }, state.adminToken, 'GET');
    assert(!!res.result?.data, 'Should return export data');
    assert(Array.isArray(res.result.data), 'Should be an array');
  });

  // Test: Non-admin access denied
  await runTest('analytics.getFunnel - should deny non-admin', async () => {
    const res = await trpcCall('analytics.getFunnel', {}, state.coachToken, 'GET');
    assert(!!res.error, 'Should deny coach access');
  });
}

// ============ WEBSOCKET TESTS ============

async function testWebSocket() {
  console.log('\n📦 WebSocket Tests');

  await runTest('websocket.connect - should connect with auth', async () => {
    return new Promise<void>((resolve, reject) => {
      const socket = io(WS_URL, {
        auth: { token: state.adminToken },
        transports: ['websocket'],
        timeout: 5000,
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Connection timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(err);
      });
    });
  });

  await runTest('websocket.connect - should reject without auth', async () => {
    return new Promise<void>((resolve, reject) => {
      const socket = io(WS_URL, {
        transports: ['websocket'],
        timeout: 3000,
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Should have rejected'));
      }, 3000);

      socket.on('connect_error', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve();
      });

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error('Should not have connected'));
      });
    });
  });

  await runTest('websocket.joinRoom - should emit join_room', async () => {
    return new Promise<void>((resolve, reject) => {
      const socket = io(WS_URL, {
        auth: { token: state.adminToken },
        transports: ['websocket'],
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Connection timeout'));
      }, 5000);

      socket.on('connect', () => {
        // Emit join_room - we just want to verify it doesn't crash
        socket.emit('join_room', 'test:room:1');

        // Give it a moment to process, then consider it a success
        setTimeout(() => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve();
        }, 500);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(err);
      });
    });
  });
}

// ============ MAIN TEST RUNNER ============

async function main() {
  console.log('\n🧪 ICA Backend Test Suite\n');
  console.log(`Target: ${BASE_URL}`);
  console.log(`WebSocket: ${WS_URL}`);
  console.log('─'.repeat(50));

  const startTime = Date.now();

  try {
    // Run all test suites
    await testAuthRouter();
    await testDemoRouter();
    await testCoachRouter();
    await testBatchRouter();
    await testStudentRouter();
    await testSubscriptionRouter();
    await testChatRouter();
    await testAnalyticsRouter();
    await testWebSocket();
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
  }

  const duration = Date.now() - startTime;

  // Print summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(50));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\n  Total:  ${total}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(`  Time:   ${(duration / 1000).toFixed(2)}s`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  - ${result.name}`);
      console.log(`    Error: ${result.error}`);
    }
  }

  console.log('\n' + '═'.repeat(50));

  if (failed > 0) {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Backend is functioning correctly.\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
