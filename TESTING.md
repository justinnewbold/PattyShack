# Testing Guide

PattyShack uses **Jest** for unit and integration testing, with **Supertest** for HTTP endpoint testing.

## Test Infrastructure

### Test Types

1. **Integration Tests** (`tests/integration/`) - Test API endpoints with real database
2. **Unit Tests** (`tests/unit/`) - Test service business logic and calculations

### Test Database

Tests use a separate PostgreSQL database (`pattyshack_test`) to avoid interfering with development data.

## Quick Start

### 1. Start Test Database

```bash
# Start PostgreSQL test database (uses port 5433)
npm run db:test:setup

# Or use the same development database
npm run db:setup
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test:coverage

# Run in watch mode (re-runs on file changes)
npm test:watch

# Run only integration tests
npm test:integration

# Run only unit tests
npm test:unit

# Run specific test file
npm test tests/integration/tasks.test.js
```

### 3. Stop Test Database

```bash
npm run db:test:stop
```

## Test Structure

### Integration Tests

Integration tests verify the complete request-response cycle through the API:

```javascript
describe('Tasks API', () => {
  let app;
  let testLocation;
  let testUser;

  beforeAll(async () => {
    initializePool();
    await setupTestDatabase();
    app = createTestApp();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    testLocation = await createTestLocation({...});
    testUser = await createTestUser({...});
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create a new task', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'Test Task', ... })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Test Task');
  });
});
```

**Integration tests are located in:**
- `tests/integration/tasks.test.js` - Task management endpoints
- `tests/integration/temperatures.test.js` - Temperature monitoring endpoints
- `tests/integration/inventory.test.js` - Inventory management endpoints
- `tests/integration/schedules.test.js` - Labor scheduling endpoints

### Unit Tests

Unit tests verify business logic in services without HTTP overhead:

```javascript
describe('TaskService', () => {
  beforeAll(async () => {
    initializePool();
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should calculate next due date for recurring tasks', () => {
    const currentDate = new Date('2024-01-01');
    const nextDate = TaskService.calculateNextDueDate(currentDate, 'daily');

    expect(nextDate.getDate()).toBe(2);
  });
});
```

**Unit tests are located in:**
- `tests/unit/taskService.test.js` - Task business logic
- `tests/unit/temperatureService.test.js` - Temperature thresholds and alerts
- `tests/unit/inventoryService.test.js` - Inventory calculations and variance

## Test Helpers

### testDb.js

Database utilities for test setup and fixtures:

```javascript
const {
  setupTestDatabase,      // Create schema
  clearTestDatabase,      // Truncate all tables
  teardownTestDatabase,   // Close connections
  createTestUser,         // Create test user
  createTestLocation,     // Create test location
  createTestTask,         // Create test task
  getTestPool             // Get database pool
} = require('./helpers/testDb');
```

### testApp.js

Creates Express app instance for testing:

```javascript
const { createTestApp } = require('./helpers/testApp');

const app = createTestApp();
```

## Writing Tests

### Best Practices

1. **Use descriptive test names** - Test names should clearly describe what is being tested
   ```javascript
   it('should create alert for temperature out of range', ...)
   ```

2. **Test one thing per test** - Keep tests focused and isolated
   ```javascript
   // Good
   it('should filter tasks by status', ...)
   it('should filter tasks by location', ...)

   // Bad
   it('should filter tasks', ...) // Too vague
   ```

3. **Clean up after each test** - Use `beforeEach` and `afterEach` hooks
   ```javascript
   beforeEach(async () => {
     await clearTestDatabase();
   });
   ```

4. **Test edge cases** - Null values, empty arrays, division by zero, etc.
   ```javascript
   it('should handle empty waste logs', ...)
   it('should handle division by zero in variance calculation', ...)
   ```

5. **Use proper assertions** - Be specific about what you're testing
   ```javascript
   // Good
   expect(response.body.data.title).toBe('Test Task');
   expect(response.body.data).toHaveProperty('id');

   // Bad
   expect(response.body.data).toBeDefined(); // Too vague
   ```

### Example: Adding a New Test

```javascript
describe('POST /api/v1/tasks/:id/reassign', () => {
  let testTask;
  let testUser;

  beforeEach(async () => {
    testTask = await createTestTask({
      id: 'task-1',
      title: 'Task to Reassign',
      location_id: testLocation.id
    });

    testUser = await createTestUser({
      id: 'new-assignee',
      role: 'crew'
    });
  });

  it('should reassign task to new user', async () => {
    const response = await request(app)
      .post(`/api/v1/tasks/${testTask.id}/reassign`)
      .send({ assignedTo: testUser.id })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.assignedTo).toBe(testUser.id);
  });

  it('should reject reassignment to invalid user', async () => {
    const response = await request(app)
      .post(`/api/v1/tasks/${testTask.id}/reassign`)
      .send({ assignedTo: 'invalid-user-id' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
```

## Test Coverage

### Viewing Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI tools

### Coverage Goals

- **Overall**: 80%+
- **Services**: 90%+ (business logic is critical)
- **Routes**: 80%+
- **Utils**: 85%+

### What's Excluded from Coverage

- `src/server/index.js` - Server startup file
- `src/database/migrations/` - SQL migration files
- `src/database/seeds.js` - Demo data seeding

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: pattyshack_test
          POSTGRES_USER: pattyshack_user
          POSTGRES_PASSWORD: pattyshack_dev_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          NODE_ENV: test
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: pattyshack_test
          TEST_DB_USER: pattyshack_user
          TEST_DB_PASSWORD: pattyshack_dev_password

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

## Test Configuration

### jest.config.js

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server/index.js',
    '!src/database/migrations/**',
    '!src/database/seeds.js'
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true
};
```

### Environment Variables for Tests

Tests automatically use these environment variables (set in `tests/setup.js`):

```env
NODE_ENV=test
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pattyshack_test
DB_USER=pattyshack_user
DB_PASSWORD=pattyshack_dev_password
SEED_DATABASE=false
```

Override with your own values if needed:

```bash
TEST_DB_HOST=my-test-db npm test
```

## Debugging Tests

### Enable Debug Logs

```bash
DEBUG_TESTS=true npm test
```

This will show console.log output from tests.

### Run Single Test

```bash
# Run specific test file
npm test tests/integration/tasks.test.js

# Run specific test suite
npm test -- -t "Tasks API"

# Run specific test
npm test -- -t "should create a new task"
```

### Use Jest Watch Mode

```bash
npm test:watch
```

Watch mode re-runs tests when files change and provides an interactive menu:
- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `p` to filter by filename pattern
- Press `t` to filter by test name
- Press `q` to quit

### Inspect Database State

Add a breakpoint in your test:

```javascript
it('should create a task', async () => {
  const response = await request(app).post('/api/v1/tasks').send({...});

  // Inspect database
  const pool = getTestPool();
  const result = await pool.query('SELECT * FROM tasks');
  console.log(result.rows);

  expect(response.body.success).toBe(true);
});
```

## Common Issues

### Test Database Connection Fails

**Problem**: `Database connection failed` error

**Solutions**:
1. Ensure test database is running: `npm run db:test:setup`
2. Check credentials match in `tests/setup.js`
3. Try resetting database: `npm run db:test:stop && npm run db:test:setup`

### Tests Hang or Timeout

**Problem**: Tests don't complete, Jest hangs

**Solutions**:
1. Ensure `teardownTestDatabase()` is called in `afterAll()`
2. Check for unclosed database connections
3. Increase timeout: `jest.setTimeout(30000)`

### Flaky Tests

**Problem**: Tests pass sometimes, fail other times

**Solutions**:
1. Ensure `clearTestDatabase()` is called in `beforeEach()`
2. Don't depend on test execution order
3. Avoid hardcoded IDs - use unique IDs per test
4. Check for race conditions in async code

### Port Already in Use

**Problem**: `EADDRINUSE` error

**Solutions**:
1. Test database uses port 5433 (not 5432)
2. Stop conflicting services
3. Change port in `docker-compose.test.yml`

## Test Data

### Creating Test Fixtures

Use helper functions to create consistent test data:

```javascript
// Create location
const location = await createTestLocation({
  id: 'loc-1',
  code: 'TEST-001',
  name: 'Test Location'
});

// Create user
const user = await createTestUser({
  id: 'user-1',
  role: 'manager',
  location_id: location.id
});

// Create task
const task = await createTestTask({
  id: 'task-1',
  title: 'Test Task',
  location_id: location.id,
  assigned_to: user.id
});
```

### Test Data Best Practices

1. **Use unique IDs** - Avoid ID conflicts between tests
   ```javascript
   id: `test-task-${Date.now()}`
   ```

2. **Minimal fixtures** - Only create data needed for the test
   ```javascript
   // Good - only what's needed
   await createTestTask({ location_id: testLocation.id });

   // Bad - unnecessary data
   await createTestTask({ /* 20 fields */ });
   ```

3. **Reusable fixtures** - Create fixtures in `beforeEach` for common scenarios
   ```javascript
   beforeEach(async () => {
     testLocation = await createTestLocation();
     testUser = await createTestUser({ location_id: testLocation.id });
   });
   ```

## Next Steps

After setting up testing:

1. ✅ Write tests for new features before implementation (TDD)
2. ✅ Run tests before committing code
3. ✅ Maintain 80%+ test coverage
4. ✅ Add tests to CI/CD pipeline
5. 🔜 Set up automated testing on pull requests
6. 🔜 Add performance testing (load testing)
7. 🔜 Add end-to-end tests (E2E) with real workflows

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

For more information, see:
- [API Documentation](./docs/API.md)
- [Database Setup Guide](./DATABASE_SETUP.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
