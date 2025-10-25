# Testing Guide

This document provides comprehensive information about testing in the EU Real Estate Portal.

## Overview

The testing strategy follows a multi-layered approach with different types of tests:

- **Unit Tests** - Test individual functions and components in isolation
- **Integration Tests** - Test interactions between different parts of the system
- **End-to-End Tests** - Test complete user workflows from start to finish
- **Performance Tests** - Test system performance under various loads
- **API Tests** - Test REST API endpoints with various scenarios

## Test Structure

```
apps/api/src/__tests__/
├── setup.ts                 # Test setup and utilities
├── global-setup.ts         # Global test environment setup
├── global-teardown.ts      # Global test cleanup
├── auth.test.ts            # Authentication API tests
├── property.test.ts        # Property API tests
├── integration.test.ts     # Third-party integration tests
├── e2e.test.ts            # End-to-end workflow tests
└── performance.test.ts     # Performance and load tests
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run tests for CI/CD
npm run test:ci

# Debug tests
npm run test:debug
```

### Test Environment Setup

Tests use a separate test database and Redis instance to avoid conflicts with development data:

```bash
# Environment variables for testing
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/eu_real_estate_test
REDIS_URL_TEST=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret
```

## Test Categories

### 1. Unit Tests

Unit tests focus on testing individual functions and services in isolation.

**Example: Authentication Service Tests**
```typescript
describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'BUYER',
        country: 'DE',
        language: 'en',
      };

      const result = await AuthService.register(userData);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe(userData.email);
    });
  });
});
```

**Coverage Areas:**
- Authentication and authorization logic
- Property management services
- Third-party integration services
- Cache and performance services
- Validation and error handling

### 2. Integration Tests

Integration tests verify that different parts of the system work together correctly.

**Example: Third-Party Integration Tests**
```typescript
describe('Integration Tests', () => {
  describe('Third-Party Integration API', () => {
    it('should get property valuation successfully', async () => {
      const response = await request(app)
        .post('/api/integrations/property/valuation')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          address: 'Unter den Linden 1, Berlin',
          propertyType: 'APARTMENT',
          size: 85,
          country: 'DE',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valuations).toBeDefined();
    });
  });
});
```

**Coverage Areas:**
- API endpoint functionality
- Database operations
- Cache integration
- Third-party service integration
- Authentication and authorization middleware

### 3. End-to-End Tests

E2E tests simulate complete user workflows from start to finish.

**Example: Complete Property Listing Workflow**
```typescript
it('should complete the full property listing workflow', async () => {
  // Step 1: Agent creates property
  const createResponse = await request(app)
    .post('/api/properties')
    .set('Authorization', `Bearer ${agentToken}`)
    .send(propertyData)
    .expect(201);

  // Step 2: Get property valuation
  const valuationResponse = await request(app)
    .post('/api/integrations/property/valuation')
    .set('Authorization', `Bearer ${agentToken}`)
    .send(valuationData)
    .expect(200);

  // ... continue with complete workflow
});
```

**Workflow Coverage:**
- User registration and verification
- Property listing creation and management
- Property search and filtering
- Transaction creation and management
- Third-party service integration
- Notification and communication

### 4. Performance Tests

Performance tests ensure the system meets performance requirements under various loads.

**Example: Response Time Tests**
```typescript
it('should respond to property listing requests within acceptable time', async () => {
  const startTime = performance.now();
  
  const response = await request(app)
    .get('/api/properties')
    .query({ limit: 20 })
    .expect(200);

  const endTime = performance.now();
  const responseTime = endTime - startTime;

  expect(responseTime).toBeLessThan(500); // 500ms threshold
});
```

**Performance Metrics:**
- API response times
- Concurrent request handling
- Cache performance
- Database query performance
- Memory usage and leak detection
- Load testing simulation

## Test Data Management

### Test Database

Tests use a separate test database that is reset before each test run:

```typescript
// Global setup
export default async function globalSetup() {
  // Reset test database
  execSync('npx prisma db push --force-reset', {
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST }
  });
}
```

### Test Data Creation

Test data is created using factory functions and seed data:

```typescript
export async function seedTestData(): Promise<void> {
  // Create test users
  await testPrisma.user.createMany({
    data: [
      {
        email: 'buyer@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'John',
        lastName: 'Buyer',
        role: 'BUYER',
        // ... other fields
      },
      // ... more test users
    ],
  });

  // Create test properties
  await testPrisma.property.createMany({
    data: [
      // ... test properties
    ],
  });
}
```

### Mock Services

External services are mocked to ensure tests are isolated and reliable:

```typescript
// Mock third-party services
jest.mock('../services/third-party-integration.service');

export const mockThirdPartyResponses = {
  propertyValuation: [
    {
      propertyId: 'epd_12345',
      estimatedValue: 450000,
      currency: 'EUR',
      confidence: 0.85,
      // ... other fields
    },
  ],
  // ... other mock responses
};
```

## Test Utilities

### Custom Matchers

Custom Jest matchers for common validations:

```typescript
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass,
    };
  },
});
```

### Test Helpers

Helper functions for common test operations:

```typescript
export function createTestToken(userId: string, role: string = 'BUYER'): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}

export async function cleanDatabase(): Promise<void> {
  const tablenames = await testPrisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
}
```

## Coverage Requirements

The project maintains high test coverage standards:

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### Coverage Reports

Coverage reports are generated in multiple formats:

- **Text** - Console output during test runs
- **LCOV** - For integration with CI/CD and code quality tools
- **HTML** - Detailed browser-viewable reports
- **JSON** - Machine-readable format for automation

## Continuous Integration

### GitHub Actions Integration

Tests are automatically run on every pull request and push:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

### Pre-commit Hooks

Tests are run automatically before commits using Husky:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit && npm run test:integration"
    }
  }
}
```

## Best Practices

### 1. Test Organization

- **Group related tests** using `describe` blocks
- **Use descriptive test names** that explain what is being tested
- **Follow AAA pattern** - Arrange, Act, Assert
- **Keep tests focused** - one assertion per test when possible

### 2. Test Data

- **Use factories** for creating test data
- **Clean up after tests** to avoid side effects
- **Use realistic data** that represents actual use cases
- **Avoid hardcoded values** - use variables and constants

### 3. Mocking

- **Mock external dependencies** to ensure test isolation
- **Use consistent mock data** across related tests
- **Reset mocks** between tests to avoid interference
- **Mock at the right level** - service level rather than implementation details

### 4. Assertions

- **Use specific assertions** rather than generic ones
- **Test both success and failure cases**
- **Verify side effects** like database changes or API calls
- **Use custom matchers** for domain-specific validations

### 5. Performance

- **Run tests in parallel** when possible
- **Use test databases** separate from development
- **Clean up resources** to prevent memory leaks
- **Monitor test execution time** and optimize slow tests

## Debugging Tests

### Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues

1. **Database Connection Issues**
   - Ensure test database is running
   - Check connection string format
   - Verify database permissions

2. **Mock Issues**
   - Clear mocks between tests
   - Verify mock implementations
   - Check mock call expectations

3. **Async Issues**
   - Use proper async/await syntax
   - Handle promise rejections
   - Set appropriate timeouts

4. **Test Isolation**
   - Clean up test data
   - Reset global state
   - Avoid shared mutable state

## Reporting and Metrics

### Test Results

Test results include:
- **Pass/Fail Status** - Overall test suite health
- **Coverage Metrics** - Code coverage percentages
- **Performance Metrics** - Test execution times
- **Error Details** - Detailed failure information

### Quality Gates

Tests must pass these quality gates:
- **All tests pass** - No failing tests allowed
- **Coverage threshold** - Minimum 80% coverage
- **Performance benchmarks** - Response times within limits
- **Security checks** - No security vulnerabilities

## Future Enhancements

Planned testing improvements:

1. **Visual Regression Testing** - Screenshot comparison for UI components
2. **Contract Testing** - API contract validation with external services
3. **Chaos Engineering** - Fault injection and resilience testing
4. **Accessibility Testing** - Automated accessibility compliance checks
5. **Security Testing** - Automated security vulnerability scanning

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## Support

For testing-related questions or issues:
- Check the test documentation
- Review existing test examples
- Consult the development team
- Create issues for test infrastructure problems