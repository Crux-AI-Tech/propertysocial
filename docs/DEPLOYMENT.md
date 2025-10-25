# EU Real Estate Portal - Deployment Guide

## Overview

This document provides comprehensive deployment instructions for the EU Real Estate Portal, covering both local development and production deployment using AWS infrastructure.

## Quick Start - Local Development

### Prerequisites

- Node.js 18+ 
- npm
- Git

### Setup

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd eu-real-estate-portal
   ./setup-dev.sh
   ```

2. **Start Development Servers**
   ```bash
   ./start-dev.sh
   ```

3. **Access the Application**
   - **Web App**: http://localhost:5174
   - **API**: http://localhost:8020
   - **Health Check**: http://localhost:8020/health

### Test Accounts

- **Admin**: admin@eu-real-estate.com / password123
- **Agent**: agent@eu-real-estate.com / password123  
- **Buyer**: buyer@eu-real-estate.com / password123

## Port Configuration

The application uses the following ports (avoiding 3000-5010 and 9000-9010 ranges):

- **API Server**: 8020
- **Web Server**: 5174 (or next available port)
- **PostgreSQL**: 5434 (Docker)
- **Redis**: 6380 (Docker)
- **Elasticsearch**: 9200 (Docker)

## Environment Configuration

### Development (.env)

```bash
# API Configuration
NODE_ENV=development
PORT=8020

# Database
DATABASE_URL="file:./dev.db"

# Frontend
FRONTEND_URL="http://localhost:5174"

# JWT Secrets
JWT_SECRET="dev-jwt-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"

# Development flags
DEV_MODE=true
MOCK_EXTERNAL_SERVICES=true
```

### Production Environment Variables

See `.env.example` for complete production configuration including:

- AWS credentials and S3 configuration
- PostgreSQL connection strings
- Redis and Elasticsearch URLs
- Third-party API keys (Google Maps, payment gateways)
- Email and SMS service configuration
- Monitoring and analytics setup

## Production Deployment

### AWS Infrastructure (Terraform)

The production deployment uses Infrastructure as Code with Terraform:

```bash
cd infrastructure
./deploy.sh [environment] [aws-region]
```

#### Infrastructure Components

- **VPC**: Multi-AZ setup with public, private, and database subnets
- **ECS Fargate**: Container orchestration for API and web services
- **RDS PostgreSQL**: Managed database with automated backups
- **ElastiCache Redis**: Managed caching layer
- **Application Load Balancer**: SSL termination and traffic routing
- **ECR**: Container image registry
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: Secure credential storage

#### Deployment Process

1. **Infrastructure Setup**
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan -var-file="terraform.tfvars"
   terraform apply -var-file="terraform.tfvars"
   ```

2. **Container Images**
   ```bash
   # Build and push API image
   docker build -f docker/api/Dockerfile.dev -t api .
   docker tag api:latest <ecr-repo-url>/api:latest
   docker push <ecr-repo-url>/api:latest

   # Build and push Web image  
   docker build -f docker/web/Dockerfile.dev -t web .
   docker tag web:latest <ecr-repo-url>/web:latest
   docker push <ecr-repo-url>/web:latest
   ```

3. **Database Migration**
   ```bash
   cd libs/database
   DATABASE_URL="<production-db-url>" npx prisma migrate deploy
   DATABASE_URL="<production-db-url>" npx tsx src/seed.ts
   ```

## Docker Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services

- **postgres**: PostgreSQL database (port 5434)
- **redis**: Redis cache (port 6380)  
- **elasticsearch**: Search engine (port 9200)
- **api**: Node.js API server (port 8020)
- **web**: React web application (port 5174)

## Database Management

### Prisma Commands

```bash
cd libs/database

# Generate client
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration-name>

# Deploy migrations
npx prisma migrate deploy

# Seed database
npx tsx src/seed.ts

# Studio (database GUI)
npx prisma studio
```

### Database Schema

The application uses PostgreSQL with the following main entities:

- **Users**: Authentication and profile management
- **Properties**: Property listings and details
- **Transactions**: Property transactions and offers
- **Messages**: Communication between users
- **Notifications**: System notifications
- **Reviews**: Property and user reviews

## Monitoring and Logging

### Development

- **API Logs**: `apps/api/api.log`
- **Console Output**: Real-time logging to console
- **Health Check**: http://localhost:8020/health

### Production

- **CloudWatch Logs**: Centralized logging for all services
- **Application Performance Monitoring**: Error tracking and performance metrics
- **Health Checks**: Automated health monitoring with alerts
- **Metrics Dashboard**: Real-time application metrics

## Security

### Development

- **CORS**: Configured for local development
- **Environment Variables**: Stored in `.env` file
- **Database**: SQLite for local development

### Production

- **HTTPS**: SSL/TLS encryption with AWS Certificate Manager
- **Secrets Management**: AWS Secrets Manager for sensitive data
- **VPC**: Private networking with security groups
- **Database Encryption**: Encrypted at rest and in transit
- **Container Security**: Regular image scanning and updates

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -ti:8020 | xargs kill -9
   ```

2. **Database Connection Issues**
   ```bash
   cd libs/database
   npx prisma db push --accept-data-loss
   ```

3. **Environment Variables Not Loading**
   - Check `.env` file exists in project root
   - Verify `dotenv.config({ path: '../../.env' })` in API

4. **Docker Issues**
   ```bash
   docker-compose down
   docker system prune -f
   docker-compose up --build
   ```

### Support

For deployment issues:

1. Check the logs: `docker-compose logs <service-name>`
2. Verify environment variables are set correctly
3. Ensure all required ports are available
4. Check database connectivity and migrations

## Performance Optimization

### Development

- **Hot Reload**: Automatic code reloading with nodemon and Vite
- **TypeScript**: Type checking and compilation
- **Code Quality**: ESLint, Prettier, and Husky pre-commit hooks

### Production

- **CDN**: CloudFront for static asset delivery
- **Caching**: Redis for application caching
- **Database Optimization**: Connection pooling and query optimization
- **Container Optimization**: Multi-stage builds and minimal base images
- **Auto Scaling**: ECS auto-scaling based on CPU/memory usage

## Backup and Recovery

### Database Backups

- **Automated Backups**: RDS automated backups with 7-day retention
- **Point-in-Time Recovery**: Available for production databases
- **Manual Snapshots**: On-demand database snapshots

### Disaster Recovery

- **Multi-AZ Deployment**: High availability across availability zones
- **Infrastructure as Code**: Complete infrastructure reproducibility
- **Container Images**: Versioned and stored in ECR
- **Configuration Management**: Environment-specific configurations

---

## Next Steps

After successful deployment:

1. **Configure Monitoring**: Set up alerts and dashboards
2. **SSL Certificate**: Configure custom domain and SSL
3. **Performance Testing**: Load testing and optimization
4. **Security Audit**: Penetration testing and security review
5. **User Acceptance Testing**: Stakeholder testing and feedback