# Contributing to PattyShack

Thank you for your interest in contributing to PattyShack! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Review Process](#review-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct that could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git
- Code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/PattyShack.git
   cd PattyShack
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/justinnewbold/PattyShack.git
   ```

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   npm install --prefix frontend
   npm install --prefix mobile
   ```

2. Setup environment:
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

3. Setup database:
   ```bash
   npm run db:setup
   npm run migrate
   npm run seed
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

## Development Workflow

### Creating a Branch

Always create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

### Making Changes

1. Make your changes in your feature branch
2. Write or update tests
3. Update documentation if needed
4. Run tests locally
5. Commit your changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions/updates
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**

```bash
# Feature
git commit -m "feat(tasks): add bulk assignment functionality"

# Bug fix
git commit -m "fix(auth): resolve token expiration issue"

# Documentation
git commit -m "docs(api): update authentication endpoints"

# With body and footer
git commit -m "feat(inventory): add demand forecasting

Implements 90-day historical analysis for predicting stockouts.
Uses linear regression for trend calculation.

Closes #123"
```

## Coding Standards

### JavaScript/Node.js

- Use ES6+ features
- Use `const` and `let`, avoid `var`
- Use async/await over callbacks
- Use meaningful variable names
- Add JSDoc comments for functions

**Example:**

```javascript
/**
 * Calculate reorder point for inventory item
 * @param {string} itemId - Inventory item ID
 * @param {string} locationId - Location ID
 * @returns {Promise<number>} Reorder point quantity
 */
async function calculateReorderPoint(itemId, locationId) {
  const avgDailyUsage = await getAverageDailyUsage(itemId, locationId);
  const leadTime = await getVendorLeadTime(itemId);
  const safetyStock = avgDailyUsage * 2;

  return (avgDailyUsage * leadTime) + safetyStock;
}
```

### React/Frontend

- Use functional components with hooks
- Use destructuring for props
- Keep components small and focused
- Use PropTypes or TypeScript for type checking

**Example:**

```javascript
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function TaskList({ locationId, onTaskSelect }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [locationId]);

  async function fetchTasks() {
    try {
      setLoading(true);
      const data = await tasksService.getByLocation(locationId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskSelect(task)}
        />
      ))}
    </div>
  );
}

TaskList.propTypes = {
  locationId: PropTypes.string.isRequired,
  onTaskSelect: PropTypes.func.isRequired
};

export default TaskList;
```

### SQL/Database

- Use uppercase for SQL keywords
- Use meaningful table/column names
- Add indexes for frequently queried columns
- Use transactions for multi-step operations
- Add comments for complex queries

**Example:**

```sql
-- Get tasks needing escalation based on configurable rules
CREATE OR REPLACE VIEW tasks_needing_escalation AS
SELECT
  t.id,
  t.title,
  t.priority,
  t.due_date,
  t.location_id,
  er.escalation_level,
  er.notify_user_id
FROM tasks t
JOIN task_escalation_rules er ON
  t.task_type = er.task_type
  AND t.priority = er.priority
WHERE t.status = 'pending'
  AND t.due_date < NOW() - (er.overdue_threshold_hours || ' hours')::INTERVAL
  AND NOT EXISTS (
    SELECT 1 FROM task_escalations te
    WHERE te.task_id = t.id
      AND te.escalation_level = er.escalation_level
  );
```

### File Organization

```
src/
├── config/           # Configuration files
├── database/
│   ├── migrations/   # Database migrations (numbered)
│   └── seeds/        # Seed data
├── middleware/       # Express middleware
├── routes/           # API route handlers
│   └── tasks.js      # One file per resource
├── services/         # Business logic
│   └── TaskService.js # One class per resource
└── utils/            # Utility functions
```

## Testing Guidelines

### Unit Tests

- Test individual functions/methods
- Mock external dependencies
- Use descriptive test names
- Aim for >80% coverage

**Example:**

```javascript
// tests/unit/taskService.test.js
const TaskService = require('../../src/services/TaskService');

describe('TaskService', () => {
  describe('calculateNextDueDate', () => {
    it('should calculate next daily occurrence', () => {
      const currentDate = new Date('2024-11-14');
      const nextDate = TaskService.calculateNextDueDate(currentDate, 'daily');

      expect(nextDate).toEqual(new Date('2024-11-15'));
    });

    it('should calculate next weekly occurrence', () => {
      const currentDate = new Date('2024-11-14'); // Thursday
      const nextDate = TaskService.calculateNextDueDate(currentDate, 'weekly');

      expect(nextDate).toEqual(new Date('2024-11-21'));
    });

    it('should default to daily for unknown pattern', () => {
      const currentDate = new Date('2024-11-14');
      const nextDate = TaskService.calculateNextDueDate(currentDate, 'invalid');

      expect(nextDate).toEqual(new Date('2024-11-15'));
    });
  });
});
```

### Integration Tests

- Test API endpoints
- Use test database
- Clean up after tests
- Test error scenarios

**Example:**

```javascript
// tests/integration/tasks.test.js
const request = require('supertest');
const app = require('../../src/server');
const { setupTestDatabase, cleanupTestDatabase } = require('../helpers');

describe('Tasks API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          title: 'Test task',
          type: 'cleaning',
          priority: 'high',
          locationId: 'test-location-1'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test task');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          // Missing required fields
          title: 'Test task'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Submitting Changes

### Before Submitting

1. **Run tests**
   ```bash
   npm test
   ```

2. **Lint code**
   ```bash
   npm run lint
   ```

3. **Update documentation**
   - Update README if adding features
   - Add JSDoc comments
   - Update API documentation

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

### Creating a Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your feature branch
4. Fill out the PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
- [ ] Added tests
- [ ] All tests pass
- [ ] Dependent changes merged

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Closes #(issue number)
```

### PR Best Practices

- Keep PRs focused and small
- Reference related issues
- Provide clear description
- Add screenshots for UI changes
- Respond to review comments promptly
- Keep PR up to date with main branch

## Review Process

### What Reviewers Look For

1. **Code Quality**
   - Follows coding standards
   - Well-structured and readable
   - Proper error handling
   - No code smells

2. **Functionality**
   - Works as described
   - No bugs introduced
   - Edge cases handled

3. **Tests**
   - Adequate test coverage
   - Tests pass
   - Tests are meaningful

4. **Documentation**
   - Code is documented
   - README updated if needed
   - API docs updated

### Addressing Feedback

- Be open to suggestions
- Ask questions if unclear
- Make requested changes
- Mark conversations as resolved
- Request re-review when ready

### Merge Criteria

Your PR will be merged when:
- ✅ All tests pass
- ✅ Code review approved
- ✅ No merge conflicts
- ✅ CI/CD checks pass
- ✅ Documentation updated

## Development Tips

### Debugging

```javascript
// Use DEBUG environment variable
DEBUG=pattyshack:* npm run dev

// Add debug logs
const debug = require('debug')('pattyshack:tasks');
debug('Processing task', taskId);
```

### Database Helpers

```bash
# Reset database
npm run db:reset

# View migrations
npm run migrate:status

# Create new migration
npm run migrate:create add_feature_name
```

### Testing Helpers

```javascript
// tests/helpers/testDb.js
async function setupTestDatabase() {
  await pool.query('DROP SCHEMA IF EXISTS test CASCADE');
  await pool.query('CREATE SCHEMA test');
  await runMigrations();
  await seedTestData();
}

async function cleanupTestDatabase() {
  await pool.query('DROP SCHEMA IF EXISTS test CASCADE');
}
```

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Build Errors

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
```

## Getting Help

- 💬 **Discord**: Join our [Discord server](https://discord.gg/pattyshack)
- 📧 **Email**: dev@pattyshack.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/justinnewbold/PattyShack/issues)
- 📖 **Docs**: [Documentation](https://docs.pattyshack.com)

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor spotlight

Thank you for contributing to PattyShack! 🎉

---

**Questions?** Feel free to open an issue or reach out to the maintainers.
