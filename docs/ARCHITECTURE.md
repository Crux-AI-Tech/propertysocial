# EU Real Estate Portal - System Architecture

## Overview

The EU Real Estate Portal is a comprehensive, multi-tenant real estate platform designed to serve the European market. The system follows a modern microservices-inspired architecture with a monorepo structure, emphasizing scalability, maintainability, and regulatory compliance across multiple EU jurisdictions.

## Architecture Principles

### Core Principles
1. **Scalability**: Horizontal scaling capabilities for high traffic
2. **Security**: GDPR compliance and multi-layer security
3. **Performance**: Sub-second response times and efficient caching
4. **Reliability**: 99.9% uptime with fault tolerance
5. **Maintainability**: Clean code, comprehensive testing, and documentation
6. **Internationalization**: Multi-language and multi-currency support

### Design Patterns
- **Repository Pattern**: Data access abstraction
- **Service Layer Pattern**: Business logic encapsulation
- **Middleware Pattern**: Cross-cutting concerns
- **Observer Pattern**: Event-driven notifications
- **Factory Pattern**: Object creation and configuration

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application<br/>React + TypeScript]
        MOBILE[Mobile App<br/>React Native]
        API_CLIENTS[Third-party Clients<br/>REST/GraphQL]
    end

    subgraph "CDN & Load Balancer"
        CDN[CloudFront CDN]
        ALB[Application Load Balancer]
    end

    subgraph "API Gateway"
        GATEWAY[API Gateway<br/>Rate Limiting, Auth]
    end

    subgraph "Application Layer"
        API[API Server<br/>Node.js + Express]
        WEBSOCKET[WebSocket Server<br/>Real-time Communication]
        WORKER[Background Workers<br/>Queue Processing]
    end

    subgraph "Business Services"
        AUTH[Authentication Service]
        PROPERTY[Property Service]
        SEARCH[Search Service]
        TRANSACTION[Transaction Service]
        NOTIFICATION[Notification Service]
        INTEGRATION[Integration Service]
        SECURITY[Security Service]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Primary Database)]
        REDIS[(Redis<br/>Cache & Sessions)]
        ELASTICSEARCH[(Elasticsearch<br/>Search Index)]
        S3[(AWS S3<br/>File Storage)]
    end

    subgraph "External Services"
        EMAIL[Email Service<br/>SendGrid/SES]
        SMS[SMS Service<br/>Twilio]
        MAPS[Google Maps API]
        PAYMENT[Payment Gateway<br/>Stripe/PayPal]
        VALUATION[Property Valuation APIs]
        MORTGAGE[Mortgage Broker APIs]
    end

    subgraph "Monitoring & Logging"
        MONITORING[Application Monitoring<br/>DataDog/New Relic]
        LOGGING[Centralized Logging<br/>ELK Stack]
        METRICS[Metrics Collection<br/>Prometheus]
    end

    WEB --> CDN
    MOBILE --> CDN
    API_CLIENTS --> CDN
    CDN --> ALB
    ALB --> GATEWAY
    GATEWAY --> API
    GATEWAY --> WEBSOCKET

    API --> AUTH
    API --> PROPERTY
    API --> SEARCH
    API --> TRANSACTION
    API --> NOTIFICATION
    API --> INTEGRATION
    API --> SECURITY

    AUTH --> POSTGRES
    AUTH --> REDIS
    PROPERTY --> POSTGRES
    PROPERTY --> ELASTICSEARCH
    PROPERTY --> S3
    SEARCH --> ELASTICSEARCH
    TRANSACTION --> POSTGRES
    NOTIFICATION --> REDIS
    INTEGRATION --> REDIS

    WORKER --> REDIS
    WORKER --> EMAIL
    WORKER --> SMS

    INTEGRATION --> MAPS
    INTEGRATION --> PAYMENT
    INTEGRATION --> VALUATION
    INTEGRATION --> MORTGAGE

    API --> MONITORING
    API --> LOGGING
    API --> METRICS
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Library**: Material-UI (MUI) v5
- **Styling**: Emotion (CSS-in-JS)
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library
- **Internationalization**: react-i18next

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT with refresh tokens
- **Validation**: Joi schema validation
- **Documentation**: OpenAPI/Swagger
- **Testing**: Jest + Supertest
- **Process Management**: PM2

### Database & Storage
- **Primary Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Cache**: Redis 6+
- **Search Engine**: Elasticsearch 8+
- **File Storage**: AWS S3
- **CDN**: AWS CloudFront

### Infrastructure
- **Container Platform**: Docker + Docker Compose
- **Orchestration**: AWS ECS/EKS
- **Load Balancer**: AWS Application Load Balancer
- **Monitoring**: DataDog/New Relic
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **CI/CD**: GitHub Actions

## Data Architecture

### Database Schema Overview

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        enum role
        enum status
        string country
        string language
        boolean email_verified
        timestamp created_at
        timestamp updated_at
    }

    PROPERTIES {
        uuid id PK
        uuid agent_id FK
        string title
        text description
        enum property_type
        enum status
        decimal price
        string currency
        decimal size
        integer bedrooms
        integer bathrooms
        string address
        string city
        string country
        string postal_code
        decimal latitude
        decimal longitude
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    PROPERTY_IMAGES {
        uuid id PK
        uuid property_id FK
        string url
        string alt_text
        integer order_index
        timestamp created_at
    }

    PROPERTY_TAGS {
        uuid id PK
        string name UK
        string color
        timestamp created_at
    }

    PROPERTY_TAG_RELATIONS {
        uuid property_id FK
        uuid tag_id FK
    }

    TRANSACTIONS {
        uuid id PK
        uuid property_id FK
        uuid buyer_id FK
        uuid agent_id FK
        enum status
        decimal offer_amount
        string currency
        jsonb terms
        timestamp offer_date
        timestamp acceptance_date
        timestamp completion_date
        timestamp created_at
        timestamp updated_at
    }

    MESSAGES {
        uuid id PK
        uuid sender_id FK
        uuid recipient_id FK
        uuid property_id FK
        string subject
        text content
        boolean read
        timestamp sent_at
    }

    SAVED_SEARCHES {
        uuid id PK
        uuid user_id FK
        string name
        jsonb criteria
        boolean notifications_enabled
        timestamp created_at
        timestamp updated_at
    }

    FAVORITES {
        uuid id PK
        uuid user_id FK
        uuid property_id FK
        text notes
        timestamp created_at
    }

    USERS ||--o{ PROPERTIES : "agent_id"
    PROPERTIES ||--o{ PROPERTY_IMAGES : "property_id"
    PROPERTIES ||--o{ PROPERTY_TAG_RELATIONS : "property_id"
    PROPERTY_TAGS ||--o{ PROPERTY_TAG_RELATIONS : "tag_id"
    PROPERTIES ||--o{ TRANSACTIONS : "property_id"
    USERS ||--o{ TRANSACTIONS : "buyer_id"
    USERS ||--o{ TRANSACTIONS : "agent_id"
    USERS ||--o{ MESSAGES : "sender_id"
    USERS ||--o{ MESSAGES : "recipient_id"
    PROPERTIES ||--o{ MESSAGES : "property_id"
    USERS ||--o{ SAVED_SEARCHES : "user_id"
    USERS ||--o{ FAVORITES : "user_id"
    PROPERTIES ||--o{ FAVORITES : "property_id"
```

### Data Flow Architecture

```mermaid
graph LR
    subgraph "Data Ingestion"
        API_INPUT[API Requests]
        FILE_UPLOAD[File Uploads]
        EXTERNAL_DATA[External APIs]
    end

    subgraph "Processing Layer"
        VALIDATION[Input Validation]
        TRANSFORMATION[Data Transformation]
        BUSINESS_LOGIC[Business Logic]
    end

    subgraph "Storage Layer"
        POSTGRES_WRITE[(PostgreSQL<br/>Write Operations)]
        CACHE_WRITE[(Redis<br/>Cache Updates)]
        SEARCH_INDEX[(Elasticsearch<br/>Index Updates)]
        FILE_STORAGE[(S3<br/>File Storage)]
    end

    subgraph "Read Layer"
        POSTGRES_READ[(PostgreSQL<br/>Read Replicas)]
        CACHE_READ[(Redis<br/>Cache Reads)]
        SEARCH_READ[(Elasticsearch<br/>Search Queries)]
    end

    subgraph "Output Layer"
        API_RESPONSE[API Responses]
        NOTIFICATIONS[Push Notifications]
        REPORTS[Generated Reports]
    end

    API_INPUT --> VALIDATION
    FILE_UPLOAD --> VALIDATION
    EXTERNAL_DATA --> TRANSFORMATION
    
    VALIDATION --> BUSINESS_LOGIC
    TRANSFORMATION --> BUSINESS_LOGIC
    
    BUSINESS_LOGIC --> POSTGRES_WRITE
    BUSINESS_LOGIC --> CACHE_WRITE
    BUSINESS_LOGIC --> SEARCH_INDEX
    BUSINESS_LOGIC --> FILE_STORAGE
    
    POSTGRES_READ --> API_RESPONSE
    CACHE_READ --> API_RESPONSE
    SEARCH_READ --> API_RESPONSE
    
    BUSINESS_LOGIC --> NOTIFICATIONS
    POSTGRES_READ --> REPORTS
```

## Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant API_Gateway
    participant Auth_Service
    participant JWT_Service
    participant Database
    participant Redis

    Client->>API_Gateway: Login Request
    API_Gateway->>Auth_Service: Validate Credentials
    Auth_Service->>Database: Check User
    Database-->>Auth_Service: User Data
    Auth_Service->>JWT_Service: Generate Tokens
    JWT_Service-->>Auth_Service: Access + Refresh Tokens
    Auth_Service->>Redis: Store Refresh Token
    Auth_Service-->>API_Gateway: Tokens + User Data
    API_Gateway-->>Client: Authentication Response

    Note over Client: Subsequent Requests
    Client->>API_Gateway: API Request + Access Token
    API_Gateway->>JWT_Service: Validate Access Token
    JWT_Service-->>API_Gateway: Token Valid
    API_Gateway->>Auth_Service: Check Permissions
    Auth_Service-->>API_Gateway: Permission Granted
    API_Gateway->>Backend_Service: Process Request
    Backend_Service-->>API_Gateway: Response
    API_Gateway-->>Client: API Response
```

### Security Layers

1. **Network Security**
   - HTTPS/TLS 1.3 encryption
   - WAF (Web Application Firewall)
   - DDoS protection
   - IP whitelisting for admin functions

2. **Application Security**
   - JWT-based authentication
   - Role-based access control (RBAC)
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection
   - CSRF protection

3. **Data Security**
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS 1.3)
   - PII data masking
   - Secure key management (AWS KMS)
   - Regular security audits

4. **Infrastructure Security**
   - VPC with private subnets
   - Security groups and NACLs
   - IAM roles and policies
   - Container security scanning
   - Regular penetration testing

## Performance Architecture

### Caching Strategy

```mermaid
graph TB
    subgraph "Client Side"
        BROWSER_CACHE[Browser Cache]
        SERVICE_WORKER[Service Worker Cache]
    end

    subgraph "CDN Layer"
        CLOUDFRONT[CloudFront CDN<br/>Static Assets]
    end

    subgraph "Application Layer"
        API_CACHE[API Response Cache<br/>Redis]
        SESSION_CACHE[Session Cache<br/>Redis]
        QUERY_CACHE[Database Query Cache<br/>Redis]
    end

    subgraph "Database Layer"
        DB_CACHE[PostgreSQL Buffer Cache]
        SEARCH_CACHE[Elasticsearch Cache]
    end

    BROWSER_CACHE --> CLOUDFRONT
    SERVICE_WORKER --> CLOUDFRONT
    CLOUDFRONT --> API_CACHE
    API_CACHE --> SESSION_CACHE
    API_CACHE --> QUERY_CACHE
    QUERY_CACHE --> DB_CACHE
    QUERY_CACHE --> SEARCH_CACHE
```

### Performance Optimization Strategies

1. **Frontend Optimization**
   - Code splitting and lazy loading
   - Image optimization and WebP format
   - Bundle size optimization
   - Service worker for offline functionality
   - Virtual scrolling for large lists

2. **Backend Optimization**
   - Database query optimization
   - Connection pooling
   - Async processing for heavy operations
   - Response compression (gzip/brotli)
   - API response caching

3. **Database Optimization**
   - Proper indexing strategy
   - Query optimization
   - Read replicas for scaling
   - Partitioning for large tables
   - Connection pooling

4. **Infrastructure Optimization**
   - Auto-scaling groups
   - Load balancing
   - CDN for static assets
   - Geographic distribution
   - Container optimization

## Scalability Architecture

### Horizontal Scaling Strategy

```mermaid
graph TB
    subgraph "Load Balancer"
        ALB[Application Load Balancer]
    end

    subgraph "API Instances"
        API1[API Instance 1]
        API2[API Instance 2]
        API3[API Instance N]
    end

    subgraph "Database Cluster"
        MASTER[(PostgreSQL Master)]
        REPLICA1[(Read Replica 1)]
        REPLICA2[(Read Replica 2)]
    end

    subgraph "Cache Cluster"
        REDIS_MASTER[(Redis Master)]
        REDIS_REPLICA[(Redis Replica)]
    end

    subgraph "Search Cluster"
        ES_MASTER[(Elasticsearch Master)]
        ES_DATA1[(Elasticsearch Data 1)]
        ES_DATA2[(Elasticsearch Data 2)]
    end

    ALB --> API1
    ALB --> API2
    ALB --> API3

    API1 --> MASTER
    API2 --> REPLICA1
    API3 --> REPLICA2

    API1 --> REDIS_MASTER
    API2 --> REDIS_MASTER
    API3 --> REDIS_MASTER

    API1 --> ES_MASTER
    API2 --> ES_DATA1
    API3 --> ES_DATA2

    MASTER --> REPLICA1
    MASTER --> REPLICA2
    REDIS_MASTER --> REDIS_REPLICA
```

### Auto-scaling Configuration

1. **Application Scaling**
   - CPU utilization > 70%
   - Memory utilization > 80%
   - Request queue depth > 100
   - Response time > 2 seconds

2. **Database Scaling**
   - Read replica auto-scaling
   - Connection pool monitoring
   - Query performance monitoring
   - Storage auto-scaling

3. **Cache Scaling**
   - Memory utilization monitoring
   - Hit rate optimization
   - Cluster scaling based on load
   - Failover configuration

## Monitoring & Observability

### Monitoring Stack

```mermaid
graph TB
    subgraph "Application Metrics"
        APP_METRICS[Application Metrics<br/>Custom Metrics]
        BUSINESS_METRICS[Business Metrics<br/>KPIs & Analytics]
    end

    subgraph "Infrastructure Metrics"
        SYSTEM_METRICS[System Metrics<br/>CPU, Memory, Disk]
        NETWORK_METRICS[Network Metrics<br/>Latency, Throughput]
    end

    subgraph "Logs"
        APP_LOGS[Application Logs<br/>Structured JSON]
        ACCESS_LOGS[Access Logs<br/>HTTP Requests]
        ERROR_LOGS[Error Logs<br/>Exceptions & Errors]
    end

    subgraph "Monitoring Tools"
        DATADOG[DataDog<br/>Metrics & APM]
        ELK[ELK Stack<br/>Log Analysis]
        PROMETHEUS[Prometheus<br/>Metrics Collection]
        GRAFANA[Grafana<br/>Dashboards]
    end

    subgraph "Alerting"
        PAGERDUTY[PagerDuty<br/>Incident Management]
        SLACK[Slack<br/>Team Notifications]
        EMAIL[Email<br/>Alert Notifications]
    end

    APP_METRICS --> DATADOG
    BUSINESS_METRICS --> DATADOG
    SYSTEM_METRICS --> PROMETHEUS
    NETWORK_METRICS --> PROMETHEUS

    APP_LOGS --> ELK
    ACCESS_LOGS --> ELK
    ERROR_LOGS --> ELK

    DATADOG --> GRAFANA
    PROMETHEUS --> GRAFANA
    ELK --> GRAFANA

    GRAFANA --> PAGERDUTY
    GRAFANA --> SLACK
    GRAFANA --> EMAIL
```

### Key Metrics & Alerts

1. **Application Metrics**
   - Response time (p95 < 500ms)
   - Error rate (< 0.1%)
   - Throughput (requests/second)
   - Active users
   - Feature usage

2. **Infrastructure Metrics**
   - CPU utilization (< 80%)
   - Memory usage (< 85%)
   - Disk usage (< 90%)
   - Network latency
   - Database connections

3. **Business Metrics**
   - Property listings created
   - User registrations
   - Search queries
   - Transaction completions
   - Revenue metrics

## Deployment Architecture

### CI/CD Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV_CODE[Code Changes]
        DEV_COMMIT[Git Commit]
        DEV_PR[Pull Request]
    end

    subgraph "CI Pipeline"
        CI_TRIGGER[GitHub Actions Trigger]
        CI_TEST[Run Tests]
        CI_BUILD[Build Applications]
        CI_SECURITY[Security Scan]
        CI_QUALITY[Code Quality Check]
    end

    subgraph "CD Pipeline"
        CD_STAGING[Deploy to Staging]
        CD_E2E[E2E Tests]
        CD_APPROVAL[Manual Approval]
        CD_PRODUCTION[Deploy to Production]
    end

    subgraph "Monitoring"
        MONITOR_HEALTH[Health Checks]
        MONITOR_ROLLBACK[Automatic Rollback]
    end

    DEV_CODE --> DEV_COMMIT
    DEV_COMMIT --> DEV_PR
    DEV_PR --> CI_TRIGGER
    CI_TRIGGER --> CI_TEST
    CI_TEST --> CI_BUILD
    CI_BUILD --> CI_SECURITY
    CI_SECURITY --> CI_QUALITY
    CI_QUALITY --> CD_STAGING
    CD_STAGING --> CD_E2E
    CD_E2E --> CD_APPROVAL
    CD_APPROVAL --> CD_PRODUCTION
    CD_PRODUCTION --> MONITOR_HEALTH
    MONITOR_HEALTH --> MONITOR_ROLLBACK
```

### Environment Configuration

1. **Development Environment**
   - Local Docker containers
   - Hot reloading enabled
   - Debug logging
   - Test data seeding

2. **Staging Environment**
   - Production-like infrastructure
   - Automated testing
   - Performance testing
   - Security scanning

3. **Production Environment**
   - High availability setup
   - Auto-scaling enabled
   - Monitoring and alerting
   - Backup and disaster recovery

## Compliance & Regulatory Architecture

### GDPR Compliance

```mermaid
graph TB
    subgraph "Data Collection"
        CONSENT[Consent Management]
        LAWFUL_BASIS[Lawful Basis Tracking]
        DATA_MINIMIZATION[Data Minimization]
    end

    subgraph "Data Processing"
        PURPOSE_LIMITATION[Purpose Limitation]
        ACCURACY[Data Accuracy]
        RETENTION[Retention Policies]
    end

    subgraph "Data Subject Rights"
        ACCESS[Right to Access]
        RECTIFICATION[Right to Rectification]
        ERASURE[Right to Erasure]
        PORTABILITY[Data Portability]
        OBJECTION[Right to Object]
    end

    subgraph "Security & Governance"
        ENCRYPTION[Data Encryption]
        AUDIT_TRAIL[Audit Trail]
        DPO[Data Protection Officer]
        IMPACT_ASSESSMENT[Privacy Impact Assessment]
    end

    CONSENT --> PURPOSE_LIMITATION
    LAWFUL_BASIS --> PURPOSE_LIMITATION
    DATA_MINIMIZATION --> ACCURACY
    
    PURPOSE_LIMITATION --> ACCESS
    ACCURACY --> RECTIFICATION
    RETENTION --> ERASURE
    
    ACCESS --> ENCRYPTION
    RECTIFICATION --> AUDIT_TRAIL
    ERASURE --> DPO
    PORTABILITY --> IMPACT_ASSESSMENT
```

### Multi-Jurisdiction Support

1. **Country-Specific Features**
   - Legal document templates
   - Property disclosure requirements
   - Currency and tax calculations
   - Local payment methods

2. **Regulatory Compliance**
   - GDPR (EU-wide)
   - National data protection laws
   - Financial services regulations
   - Real estate licensing requirements

3. **Localization**
   - Multi-language support
   - Cultural adaptations
   - Local business practices
   - Regional customer support

## Future Architecture Considerations

### Planned Enhancements

1. **Microservices Migration**
   - Service decomposition strategy
   - API gateway implementation
   - Service mesh adoption
   - Event-driven architecture

2. **AI/ML Integration**
   - Property valuation models
   - Recommendation engines
   - Fraud detection systems
   - Chatbot integration

3. **Mobile-First Architecture**
   - Progressive Web App (PWA)
   - Native mobile applications
   - Offline-first capabilities
   - Push notification system

4. **Advanced Analytics**
   - Real-time analytics dashboard
   - Predictive analytics
   - Market trend analysis
   - User behavior analytics

### Technology Evolution

1. **Container Orchestration**
   - Kubernetes migration
   - Service mesh (Istio)
   - GitOps deployment
   - Multi-cloud strategy

2. **Database Evolution**
   - Multi-region replication
   - Event sourcing
   - CQRS implementation
   - Time-series data storage

3. **Security Enhancements**
   - Zero-trust architecture
   - Advanced threat detection
   - Automated security testing
   - Compliance automation

This architecture document serves as a living guide for the EU Real Estate Portal system. It should be updated regularly as the system evolves and new requirements emerge.