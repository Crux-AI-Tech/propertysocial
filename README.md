# EU Real Estate Portal

A comprehensive digital platform for the European property market, providing an integrated solution for property seekers, estate agents, landlords, and property developers across multiple European markets.

## 🏗️ Architecture

This project uses a modern monorepo architecture with:

- **Frontend**: React with TypeScript and Material-UI
- **Backend**: Node.js with Express and TypeScript
- **Mobile**: React Native
- **Database**: PostgreSQL with Prisma ORM
- **Search**: Elasticsearch
- **Cache**: Redis
- **Infrastructure**: Docker, AWS, Nx monorepo

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eu-real-estate-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development environment**
   ```bash
   # Start all services with Docker
   npm run docker:up
   
   # Or start individual services
   npm run dev:api    # API server
   npm run dev:web    # Web application
   ```

4. **Access the applications**
   - Web Application: http://localhost:4200
   - API Server: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - Elasticsearch: http://localhost:9200

## 📁 Project Structure

```
eu-real-estate-portal/
├── apps/                    # Applications
│   ├── api/                # Backend API
│   ├── web/                # Web application
│   └── mobile/             # Mobile application
├── libs/                   # Shared libraries
│   ├── shared/             # Shared utilities and types
│   ├── ui/                 # UI components
│   ├── api/                # API client
│   └── database/           # Database schemas and utilities
├── docker/                 # Docker configurations
├── .github/                # GitHub Actions workflows
└── tools/                  # Build and development tools
```

## 🛠️ Development Commands

```bash
# Development
npm run dev:api              # Start API server
npm run dev:web              # Start web application
npm run dev:mobile           # Start mobile application

# Building
npm run build                # Build all applications
npm run build:api            # Build API only
npm run build:web            # Build web only

# Testing
npm run test                 # Run all tests
npm run test:api             # Test API only
npm run test:web             # Test web only

# Code Quality
npm run lint                 # Lint all code
npm run format               # Format all code
npm run format:check         # Check formatting

# Docker
npm run docker:build         # Build Docker images
npm run docker:up            # Start all services
npm run docker:down          # Stop all services
```

## 🌍 Multilingual Support

The platform supports multiple European languages and locales:

- English (en)
- German (de)
- French (fr)
- Spanish (es)
- Italian (it)
- Dutch (nl)
- Portuguese (pt)
- Polish (pl)

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- GDPR compliance
- Data encryption
- Input validation and sanitization
- Rate limiting and DDoS protection

## 📊 Monitoring and Analytics

- Application Performance Monitoring (APM)
- Error tracking and alerting
- User analytics and behavior tracking
- Market trend analysis
- Performance metrics

## 🚀 Deployment

The application is designed for cloud deployment with:

- AWS ECS for container orchestration
- AWS RDS for managed PostgreSQL
- AWS ElastiCache for Redis
- AWS S3 for file storage
- AWS CloudFront for CDN

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is proprietary and confidential.

## 📞 Support

For support and questions, please contact the development team.