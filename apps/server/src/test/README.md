# Backend Test Suite

Comprehensive test suite for the ICA Operations Platform backend.

## Running Tests

### Prerequisites

1. Make sure the server is running:

   ```bash
   bun run dev
   ```

2. Make sure the database is seeded with test data:

   ```bash
   bun run db:seed
   ```

3. Make sure Redis is running (required for rate limiting and WebSocket presence)

### Run All Tests

```bash
bun run test
```

### Environment Variables

You can customize the test target:

```bash
# Test against a different server
TEST_BASE_URL=http://localhost:3001 bun run test

# Test WebSocket on different URL
TEST_WS_URL=ws://localhost:3001 bun run test
```

## Test Coverage

The test suite covers:

### 🔐 Authentication (`testAuth`)

- Admin/Coach/Customer login flows
- Token refresh mechanism
- User registration
- Password validation (weak password rejection)
- Invalid credentials handling
- Unauthorized access attempts

### 👨‍🏫 Coach Management (`testCoach`)

- List all coaches
- Get coach by ID
- Update coach profile
- Get coach schedule
- Get coach's students
- Invalid ID handling

### 📚 Batch Management (`testBatch`)

- Create new batch
- List all batches
- Get batch by ID
- Update batch settings
- Invalid coach ID rejection

### 👨‍👩‍👧 Student Management (`testStudent`)

- Create new student
- List all students
- Get student by ID
- Update student info
- Assign coach to student
- Assign batch to student
- Invalid email rejection

### 📅 Demo Management (`testDemo`)

- Create new demo
- List demos (with filters)
- Get demo by ID
- Assign coach to demo
- Update demo status
- Submit demo outcome
- Reschedule demo
- Cancel demo
- Invalid status transitions

### 💳 Subscription Management (`testSubscription`)

- Create subscription plan
- List plans
- Update plan
- Subscribe student to plan
- Cancel subscription
- Authorization checks

### 💬 Chat Functionality (`testChat`)

- Create chat room
- Send message
- Get messages
- Get chat rooms
- Unread count
- Mark as read

### 📊 Analytics (`testAnalytics`)

- Funnel analytics
- Coach performance metrics
- Admin efficiency metrics
- Dashboard data
- Export functionality
- Authorization checks

### 🔌 WebSocket (`testWebSocket`)

- Connection with auth token
- Connection rejection without token
- Join/leave room
- Send and receive messages
- Typing indicators

### 🛡️ Edge Cases & Security (`testEdgeCases`)

- Rate limiting
- SQL injection prevention
- XSS handling
- Empty string validation
- Negative number validation
- Long string handling
- Invalid UUID handling
- Past date validation
- Concurrent modification handling

## Test Output

The test runner outputs results with color coding:

- ✅ Green: Test passed
- ❌ Red: Test failed
- 📋 Cyan: Section header
- ⚠️ Yellow: Warning/details

Example output:

```
🧪 ICA Operations Platform - Backend Test Suite
   Target: http://localhost:3001
   WebSocket: ws://localhost:3001

============================================================
📋 Health Check Tests
============================================================
  ✅ Server is running (45ms)
  ✅ Health check returns service status (12ms)
  ✅ Root endpoint returns API info (8ms)

...

============================================================
📊 TEST SUMMARY
============================================================

  Total:  65 tests
  Passed: 63 tests
  Failed: 2 tests
  Duration: 12.45s

❌ FAILED TESTS:
   • Rate limiting triggers after many requests
     Expected rate limit error after 5 requests
```

## Adding New Tests

To add a new test:

1. Create a new test function following the pattern:

   ```typescript
   async function testNewFeature() {
     logSection("New Feature Tests");

     await runTest("Test description", async () => {
       const result = await trpcCall("router.procedure", input, ctx.adminToken);
       assertExists(result.data, "Should return data");
       assertEqual(result.data.field, expected, "Field should match");
     });
   }
   ```

2. Add it to the `main()` function:
   ```typescript
   await testNewFeature();
   ```

## Troubleshooting

### Tests fail with "Connection refused"

- Make sure the server is running on port 3001
- Check if another process is using the port

### Tests fail with "Unauthorized"

- The seed data may be out of date
- Run `bun run db:seed` to refresh test data

### WebSocket tests timeout

- Ensure Redis is running
- Check firewall settings

### Rate limit tests inconsistent

- Rate limits may vary based on configuration
- These tests are informational only
