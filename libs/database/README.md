# EU Real Estate Portal - Database Library

This library provides database access, schema definitions, and utilities for the EU Real Estate Portal application.

## Features

- PostgreSQL database schema using Prisma ORM
- Redis integration for caching and session storage
- Repository pattern for data access
- Database connection pooling and optimization
- Utility functions for common database operations
- Seeding scripts for development and testing

## Getting Started

### Prerequisites

- Node.js 16+
- PostgreSQL 13+
- Redis 6+

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://username:password@localhost:5432/eu_real_estate
REDIS_URL=redis://localhost:6379
DATABASE_CONNECTION_LIMIT=10
```

### Setup

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npm run db:generate
```

3. Run migrations:

```bash
npm run db:migrate:deploy
```

4. Seed the database (optional):

```bash
npm run db:seed
```

## Usage

### Importing the library

```typescript
import { prisma, redis, UserRepository, PropertyRepository } from '@eu-real-estate/database';
```

### Using repositories

```typescript
// Create a user repository instance
const userRepository = new UserRepository();

// Find a user by ID
const result = await userRepository.findById('user-id');
if (result.success) {
  const user = result.data;
  console.log(user);
} else {
  console.error(result.error);
}

// Create a new user
const createResult = await userRepository.create({
  email: 'user@example.com',
  passwordHash: 'hashed-password',
  firstName: 'John',
  lastName: 'Doe',
  role: 'BUYER',
});
```

### Using Redis for caching

```typescript
import { redis } from '@eu-real-estate/database';

// Connect to Redis
await redis.connect();

// Set a value with TTL
await redis.set('key', 'value', 3600); // TTL in seconds

// Get a value
const value = await redis.get('key');

// Delete a value
await redis.del('key');
```

## Database Schema

The database schema includes the following main entities:

- Users and authentication
- Properties and listings
- Transactions and offers
- Messages and notifications
- Saved searches and favorites

See the `prisma/schema.prisma` file for the complete schema definition.

## Scripts

- `db:generate` - Generate Prisma client
- `db:push` - Push schema changes to the database
- `db:migrate` - Create a new migration
- `db:migrate:deploy` - Apply all pending migrations
- `db:seed` - Seed the database with sample data
- `db:studio` - Open Prisma Studio
- `db:reset` - Reset the database (development only)
- `db:types` - Generate TypeScript types from Prisma schema
- `db:init` - Initialize database connections
- `db:migrate:create` - Create a new migration

## Repository Pattern

This library implements the repository pattern to provide a clean interface for data access operations. Each repository extends the `BaseRepository` class, which provides common CRUD operations.

### Available Repositories

- `UserRepository` - User-related operations
- `PropertyRepository` - Property-related operations

## Connection Pooling

The database client is configured with connection pooling to optimize performance. The connection limit can be configured using the `DATABASE_CONNECTION_LIMIT` environment variable.