# EU Real Estate Portal API Documentation

## Overview

The EU Real Estate Portal API is a comprehensive RESTful API that provides access to property listings, user management, third-party integrations, and security features across European markets.

### Base URL
- **Production**: `https://api.eu-real-estate.com/v1`
- **Staging**: `https://staging-api.eu-real-estate.com/v1`
- **Development**: `http://localhost:3000/api`

### API Version
Current version: **v1.0.0**

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Getting Started

1. **Register a new account**:
   ```http
   POST /auth/register
   ```

2. **Login to get tokens**:
   ```http
   POST /auth/login
   ```

3. **Use the access token** in subsequent requests

4. **Refresh tokens** when they expire:
   ```http
   POST /auth/refresh
   ```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| File Upload | 20 requests | 1 hour |
| Search | 30 requests | 1 minute |

Rate limit headers are included in responses:
- `RateLimit-Limit`: Request limit per window
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Error Handling

The API uses standard HTTP status codes and returns errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": "2025-01-21T10:00:00Z"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `MISSING_TOKEN` | 401 | Authentication token missing |
| `INVALID_TOKEN` | 401 | Authentication token invalid |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |

## Pagination

List endpoints support pagination using query parameters:

- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (max: 100, default: 20)

Paginated responses include metadata:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "page": 1,
    "totalPages": 8,
    "limit": 20
  }
}
```

## API Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "BUYER",
  "country": "DE",
  "language": "en"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "BUYER",
      "status": "PENDING_VERIFICATION",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "BUYER",
      "status": "ACTIVE",
      "emailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### Properties

#### Search Properties
```http
GET /properties?city=Berlin&propertyType=APARTMENT&minPrice=300000&maxPrice=800000&page=1&limit=20
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Beautiful Apartment in Berlin",
        "description": "A stunning 2-bedroom apartment...",
        "propertyType": "APARTMENT",
        "status": "ACTIVE",
        "price": 450000,
        "currency": "EUR",
        "size": 85,
        "bedrooms": 2,
        "bathrooms": 1,
        "address": "Unter den Linden 1",
        "city": "Berlin",
        "country": "DE",
        "postalCode": "10117",
        "latitude": 52.5162746,
        "longitude": 13.3777041,
        "agent": {
          "id": "456e7890-e89b-12d3-a456-426614174000",
          "firstName": "Jane",
          "lastName": "Agent",
          "email": "agent@example.com"
        },
        "createdAt": "2025-01-21T10:00:00Z",
        "updatedAt": "2025-01-21T10:00:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "totalPages": 8,
    "limit": 20
  }
}
```

#### Create Property
```http
POST /properties
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "title": "Beautiful Apartment in Berlin",
  "description": "A stunning 2-bedroom apartment in the heart of Berlin",
  "propertyType": "APARTMENT",
  "price": 450000,
  "currency": "EUR",
  "size": 85,
  "bedrooms": 2,
  "bathrooms": 1,
  "address": "Unter den Linden 1",
  "city": "Berlin",
  "country": "DE",
  "postalCode": "10117",
  "latitude": 52.5162746,
  "longitude": 13.3777041
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

class EURealEstateAPI {
  private baseURL: string;
  private accessToken?: string;

  constructor(baseURL: string = 'https://api.eu-real-estate.com/v1') {
    this.baseURL = baseURL;
  }

  async login(email: string, password: string) {
    const response = await axios.post(`${this.baseURL}/auth/login`, {
      email,
      password
    });
    
    this.accessToken = response.data.data.tokens.accessToken;
    return response.data;
  }

  async searchProperties(filters: PropertyFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await axios.get(`${this.baseURL}/properties?${params}`);
    return response.data;
  }

  async createProperty(property: PropertyCreate) {
    const response = await axios.post(`${this.baseURL}/properties`, property, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });
    return response.data;
  }
}

// Usage
const api = new EURealEstateAPI();
await api.login('user@example.com', 'password');
const properties = await api.searchProperties({
  city: 'Berlin',
  propertyType: 'APARTMENT',
  minPrice: 300000,
  maxPrice: 800000
});
```

### Python

```python
import requests
from typing import Optional, Dict, Any

class EURealEstateAPI:
    def __init__(self, base_url: str = "https://api.eu-real-estate.com/v1"):
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.session = requests.Session()

    def login(self, email: str, password: str) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/auth/login", json={
            "email": email,
            "password": password
        })
        response.raise_for_status()
        
        data = response.json()
        self.access_token = data["data"]["tokens"]["accessToken"]
        self.session.headers.update({
            "Authorization": f"Bearer {self.access_token}"
        })
        return data

    def search_properties(self, **filters) -> Dict[str, Any]:
        response = self.session.get(f"{self.base_url}/properties", params=filters)
        response.raise_for_status()
        return response.json()

    def create_property(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        response = self.session.post(f"{self.base_url}/properties", json=property_data)
        response.raise_for_status()
        return response.json()

# Usage
api = EURealEstateAPI()
api.login("user@example.com", "password")
properties = api.search_properties(
    city="Berlin",
    property_type="APARTMENT",
    min_price=300000,
    max_price=800000
)
```

## Testing

### Using cURL

```bash
# Login
curl -X POST https://api.eu-real-estate.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Search properties
curl -X GET "https://api.eu-real-estate.com/v1/properties?city=Berlin&propertyType=APARTMENT" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create property
curl -X POST https://api.eu-real-estate.com/v1/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Beautiful Apartment in Berlin",
    "description": "A stunning 2-bedroom apartment",
    "propertyType": "APARTMENT",
    "price": 450000,
    "currency": "EUR",
    "size": 85,
    "bedrooms": 2,
    "bathrooms": 1,
    "address": "Unter den Linden 1",
    "city": "Berlin",
    "country": "DE",
    "postalCode": "10117"
  }'
```

## Webhooks

The API supports webhooks for real-time notifications:

### Supported Events
- `property.created`
- `property.updated`
- `property.deleted`
- `transaction.created`
- `transaction.updated`
- `user.registered`

### Webhook Payload Example
```json
{
  "event": "property.created",
  "timestamp": "2025-01-21T10:00:00Z",
  "data": {
    "property": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Beautiful Apartment in Berlin",
      "status": "ACTIVE"
    }
  }
}
```

## Support

For API support, please contact:
- **Email**: api-support@eu-real-estate.com
- **Documentation**: https://docs.eu-real-estate.com
- **Status Page**: https://status.eu-real-estate.com