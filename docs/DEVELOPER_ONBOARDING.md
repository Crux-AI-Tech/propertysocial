# Developer Onboarding Guide

## Welcome to the EU Real Estate Portal Development Team

This guide will help you get up and running with the EU Real Estate Portal codebase quickly and efficiently.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Code Standards](#code-standards)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher (comes with Node.js)
- **Docker**: Latest stable version
- **Docker Compose**: Version 2.x or higher
- **Git**: Latest version
- **PostgreSQL**: Version 14+ (for local development)
- **Redis**: Version 6+ (for caching)

### Recommended Tools
- **VS Code**: With recommended extensions (see `.vscode/extensions.json`)
- **Postman**: For API testing
- **pgAdmin**: PostgreSQL administration
- **Redis Commander**: Redis GUI client

### System Requirements
- **OS**: macOS, Linux, or Windows with WSL2
- **RAM**: Minimum 8GB, recommended 16GB
- **Storage**: At least 10GB free space
- **CPU**: Multi-core processor recommended

## Development Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/eu-real-estate/portal.git
cd portal
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm run install:all
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/eu_real_estate"
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# File Upload
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_BUCKET_NAME="eu-real-estate-uploads"
AWS_REGION="eu-west-1"

# Third-party APIs
GOOGLE_MAPS_API_KEY="your-google-maps-key"
ELASTICSEARCH_URL="http://localhost:9200"
```

### 4. Database Setup
```bash
# Start PostgreSQL and Redis with Docker
docker-compose up -d postgres redis elasticsearch

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

### 5. Start Development Servers
```bash
# Start all services
npm run dev

# Or start individual services
npm run dev:api    # Backend API (port 3000)
npm run dev:web    # Frontend app (port 5173)
```

## Project Structure

```
eu-real-estate-portal/
├── apps/
│   ├── api/                    # Backend API application
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── services/       # Business logic services
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── utils/          # Utility functions
│   │   │   └── __tests__/      # API tests
│   │   └── package.json
│   └── web/                    # Frontend React application
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page components
│       │   ├── services/       # API client services
│       │   ├── store/          # Redux store
│       │   └── utils/          # Frontend utilities
│       └── package.json
├── libs/
│   ├── database/               # Database layer (Prisma)
│   │   ├── src/
│   │   │   ├── repositories/   # Data access layer
│   │   │   └── scripts/        # Database scripts
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema
│   └── search/                 # Elasticsearch integration
│       └── src/
├── docs/                       # Documentation
├── docker/                     # Docker configurations
├── .github/                    # GitHub workflows
└── package.json               # Root package.json
```

### Key Directories Explained

#### `/apps/api/src/`
- **`routes/`**: Express.js route definitions and handlers
- **`services/`**: Business logic and data processing
- **`middleware/`**: Authentication, validation, error handling
- **`utils/`**: Helper functions and utilities
- **`__tests__/`**: Unit and integration tests

#### `/apps/web/src/`
- **`components/`**: Reusable React components
- **`pages/`**: Top-level page components
- **`services/`**: API client and external service integrations
- **`store/`**: Redux Toolkit store configuration
- **`utils/`**: Frontend utility functions

#### `/libs/`
- **`database/`**: Shared database layer using Prisma
- **`search/`**: Elasticsearch integration and search utilities

## Getting Started

### 1. Verify Installation
```bash
# Check if all services are running
npm run health-check

# Run basic tests
npm run test:quick
```

### 2. Access the Applications
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/api/docs
- **Database Admin**: http://localhost:5050 (pgAdmin)

### 3. Create Your First Feature

#### Backend API Endpoint
1. **Create a new route** in `apps/api/src/routes/`
2. **Add business logic** in `apps/api/src/services/`
3. **Write tests** in `apps/api/src/__tests__/`

Example:
```typescript
// apps/api/src/routes/example.ts
import { Router } from 'express';
import { ExampleService } from '../services/example.service';

const router = Router();
const exampleService = new ExampleService();

router.get('/example', async (req, res) => {
  try {
    const result = await exampleService.getExample();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### Frontend Component
1. **Create component** in `apps/web/src/components/`
2. **Add to page** in `apps/web/src/pages/`
3. **Connect to API** using services

Example:
```tsx
// apps/web/src/components/ExampleComponent.tsx
import React, { useEffect, useState } from 'react';
import { exampleApi } from '../services/api/exampleApi';

export const ExampleComponent: React.FC = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await exampleApi.getExample();
        setData(result.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Example Component</h2>
      {data ? <pre>{JSON.stringify(data, null, 2)}</pre> : 'Loading...'}
    </div>
  );
};
```

## Development Workflow

### 1. Branch Strategy
We use **Git Flow** with the following branches:
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature branches
- `hotfix/*`: Critical bug fixes
- `release/*`: Release preparation

### 2. Feature Development Process
```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. Make your changes
# ... code, test, commit ...

# 3. Push and create pull request
git push origin feature/your-feature-name
# Create PR on GitHub targeting 'develop'

# 4. After review and approval, merge via GitHub
```

### 3. Commit Message Convention
We follow **Conventional Commits**:
```
type(scope): description

feat(api): add user authentication endpoint
fix(web): resolve login form validation issue
docs(readme): update installation instructions
test(api): add unit tests for user service
refactor(web): improve component structure
```

### 4. Code Review Process
1. **Self-review**: Check your own code before submitting
2. **Automated checks**: Ensure all CI checks pass
3. **Peer review**: At least one team member must approve
4. **Testing**: Verify functionality in development environment
5. **Documentation**: Update relevant documentation

## Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run tests for specific workspace
npm run test:api
npm run test:web

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- --testPathPattern=user.test.ts
```

### Test Structure
```
__tests__/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data and mocks
```

### Writing Tests

#### Unit Test Example
```typescript
// apps/api/src/__tests__/unit/user.service.test.ts
import { UserService } from '../../services/user.service';
import { UserRepository } from '../../../libs/database/src/repositories/user.repository';

jest.mock('../../../libs/database/src/repositories/user.repository');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockUserRepository.create.mockResolvedValue({
        id: '123',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await userService.createUser(userData);

      expect(result).toHaveProperty('id', '123');
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
    });
  });
});
```

#### Integration Test Example
```typescript
// apps/api/src/__tests__/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../main';

describe('Authentication Endpoints', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'BUYER',
        country: 'DE',
        language: 'en'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
    });
  });
});
```

## Deployment

### Development Deployment
```bash
# Build applications
npm run build

# Start production mode locally
npm run start

# Deploy to staging
npm run deploy:staging
```

### Production Deployment
Production deployments are handled through GitHub Actions:
1. **Push to main branch** triggers production deployment
2. **Automated tests** must pass
3. **Manual approval** required for production
4. **Blue-green deployment** ensures zero downtime

### Environment-Specific Configurations
- **Development**: Local Docker containers
- **Staging**: AWS ECS with RDS and ElastiCache
- **Production**: AWS ECS with Multi-AZ RDS and Redis Cluster

## Code Standards

### TypeScript Guidelines
- **Strict mode**: Always enabled
- **Type safety**: No `any` types without justification
- **Interfaces**: Prefer interfaces over types for object shapes
- **Enums**: Use const assertions for simple enums

### React Guidelines
- **Functional components**: Use hooks instead of class components
- **Props typing**: Always type component props
- **State management**: Use Redux Toolkit for global state
- **Performance**: Use React.memo and useMemo appropriately

### API Guidelines
- **RESTful design**: Follow REST principles
- **Error handling**: Consistent error response format
- **Validation**: Use Joi or Zod for input validation
- **Documentation**: OpenAPI/Swagger documentation required

### Database Guidelines
- **Migrations**: Always use Prisma migrations
- **Naming**: Use snake_case for database columns
- **Indexes**: Add appropriate indexes for performance
- **Relationships**: Define proper foreign key constraints

### Code Formatting
We use **Prettier** and **ESLint**:
```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Pre-commit Hooks
Husky runs the following checks before each commit:
- **Linting**: ESLint checks
- **Formatting**: Prettier formatting
- **Type checking**: TypeScript compilation
- **Tests**: Affected tests must pass

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev:api
```

#### Node Modules Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

#### Docker Issues
```bash
# Restart Docker services
docker-compose down
docker-compose up -d

# Rebuild containers
docker-compose build --no-cache

# Check container logs
docker-compose logs <service-name>
```

### Getting Help

#### Internal Resources
1. **Team Slack**: #dev-help channel
2. **Documentation**: Check `/docs` directory
3. **Code Reviews**: Ask team members for guidance
4. **Architecture Decisions**: See `/docs/architecture/`

#### External Resources
1. **Stack Overflow**: Tag questions with project-specific tags
2. **GitHub Issues**: Check existing issues and discussions
3. **Official Documentation**: React, Node.js, PostgreSQL, etc.

### Performance Debugging

#### API Performance
```bash
# Enable debug logging
DEBUG=api:* npm run dev:api

# Profile API endpoints
npm run profile:api

# Monitor database queries
npm run db:log
```

#### Frontend Performance
```bash
# Analyze bundle size
npm run analyze:web

# Performance profiling
npm run profile:web

# Lighthouse audit
npm run audit:web
```

### Security Considerations

#### Environment Variables
- Never commit `.env` files
- Use different secrets for each environment
- Rotate secrets regularly
- Use AWS Secrets Manager in production

#### Dependencies
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

#### Code Security
- **Input validation**: Always validate user input
- **SQL injection**: Use parameterized queries (Prisma handles this)
- **XSS protection**: Sanitize user-generated content
- **Authentication**: Implement proper JWT handling

## Next Steps

After completing this onboarding:

1. **Join team meetings**: Daily standups and sprint planning
2. **Review architecture**: Read `/docs/architecture/` documentation
3. **Pick up first task**: Start with "good first issue" labeled tickets
4. **Set up IDE**: Install recommended VS Code extensions
5. **Join communication channels**: Slack, email lists, etc.

Welcome to the team! If you have any questions, don't hesitate to reach out to your team lead or post in the #dev-help Slack channel.