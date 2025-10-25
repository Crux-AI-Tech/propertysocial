# Third-Party Integrations Guide

This document provides comprehensive information about all third-party integrations used in the EU Real Estate Portal.

## Overview

The platform integrates with various external services to provide comprehensive real estate functionality across European markets:

- **Property Valuation Services** - Automated property value estimation
- **Mortgage Broker Services** - Mortgage quotes and financing options
- **Legal Services** - Legal service provider directory
- **Payment Gateways** - European payment method support
- **Location Services** - Address geocoding and mapping
- **Communication Services** - Email and SMS notifications

## Configuration

All integrations are configured through environment variables. Copy `.env.example` to `.env` and configure the required API keys.

### Required Environment Variables

```bash
# Property Valuation Services
EPD_API_KEY=your-epd-api-key
PROPERTY_RADAR_API_KEY=your-property-radar-api-key

# Mortgage Broker Services
EU_MORTGAGE_API_KEY=your-eu-mortgage-api-key
MORTGAGE_FINDER_API_KEY=your-mortgage-finder-api-key

# Legal Services
EU_LEGAL_API_KEY=your-eu-legal-api-key

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
ADYEN_API_KEY=your-adyen-api-key

# Location Services
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Communication Services
SENDGRID_API_KEY=SG.your-sendgrid-api-key
TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

## API Endpoints

### Property Valuation

Get property valuations from multiple sources:

```http
POST /api/integrations/property/valuation
Content-Type: application/json
Authorization: Bearer <token>

{
  "address": "123 Main Street, Berlin",
  "propertyType": "APARTMENT",
  "size": 85,
  "country": "DE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valuations": [
      {
        "propertyId": "epd_12345",
        "estimatedValue": 450000,
        "currency": "EUR",
        "confidence": 0.85,
        "lastUpdated": "2025-01-21T10:00:00Z",
        "source": "European Property Data",
        "comparables": [
          {
            "address": "125 Main Street, Berlin",
            "price": 440000,
            "size": 80,
            "distance": 50
          }
        ]
      }
    ],
    "count": 1,
    "averageValue": 450000
  }
}
```

### Mortgage Quotes

Get mortgage quotes from multiple brokers:

```http
POST /api/integrations/mortgage/quotes
Content-Type: application/json
Authorization: Bearer <token>

{
  "propertyValue": 450000,
  "downPayment": 90000,
  "income": 75000,
  "country": "DE",
  "currency": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "lenderId": "lender_123",
        "lenderName": "Deutsche Bank",
        "interestRate": 2.5,
        "monthlyPayment": 1650,
        "totalAmount": 360000,
        "term": 25,
        "currency": "EUR",
        "conditions": ["Stable employment required", "Property insurance mandatory"],
        "validUntil": "2025-02-21T10:00:00Z"
      }
    ],
    "count": 1,
    "bestRate": 2.5
  }
}
```

### Legal Services

Find legal service providers:

```http
GET /api/integrations/legal/services?serviceType=conveyancing&country=DE&language=en
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "providerId": "legal_456",
        "providerName": "Berlin Legal Services",
        "serviceType": "conveyancing",
        "estimatedCost": 2500,
        "currency": "EUR",
        "estimatedDuration": 30,
        "languages": ["en", "de"],
        "jurisdictions": ["DE"],
        "rating": 4.8,
        "contact": {
          "email": "info@berlinlegal.de",
          "phone": "+49301234567",
          "address": "Unter den Linden 1, Berlin"
        }
      }
    ],
    "count": 1
  }
}
```

### Payment Methods

Get available payment methods for a country:

```http
GET /api/integrations/payment/methods?country=DE&currency=EUR
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "methods": [
      {
        "id": "stripe_sepa",
        "name": "SEPA Direct Debit",
        "type": "bank_transfer",
        "countries": ["DE", "FR", "ES", "IT", "NL", "BE", "AT"],
        "currencies": ["EUR"],
        "processingFee": 0.8,
        "processingTime": "3-5 business days",
        "enabled": true
      }
    ],
    "count": 1
  }
}
```

### Geocoding

Convert addresses to coordinates:

```http
POST /api/integrations/geocode
Content-Type: application/json
Authorization: Bearer <token>

{
  "address": "Brandenburg Gate, Berlin",
  "country": "DE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lat": 52.5162746,
    "lng": 13.3777041,
    "formattedAddress": "Brandenburg Gate, Pariser Platz, 10117 Berlin, Germany",
    "components": [
      {
        "long_name": "Brandenburg Gate",
        "short_name": "Brandenburg Gate",
        "types": ["establishment", "point_of_interest", "tourist_attraction"]
      }
    ]
  }
}
```

### Email Notifications

Send multilingual emails:

```http
POST /api/integrations/email/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "to": "user@example.com",
  "templateId": "property_inquiry",
  "data": {
    "propertyTitle": "Beautiful Apartment in Berlin",
    "inquiryMessage": "I'm interested in viewing this property"
  },
  "language": "de"
}
```

### SMS Notifications

Send SMS with country-specific formatting:

```http
POST /api/integrations/sms/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "phoneNumber": "1234567890",
  "message": "Your property viewing is confirmed for tomorrow at 2 PM",
  "country": "DE"
}
```

## Integration Health Monitoring

### Health Check

Monitor the status of all integrations:

```http
GET /api/integrations/health
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "status": "healthy",
      "healthy": 8,
      "total": 10,
      "percentage": 80
    },
    "integrations": {
      "EUROPEAN_PROPERTY_DATA": {
        "name": "European Property Data",
        "status": "healthy",
        "responseTime": 245,
        "lastChecked": "2025-01-21T10:00:00Z"
      },
      "STRIPE": {
        "name": "Stripe",
        "status": "degraded",
        "responseTime": 1200,
        "lastChecked": "2025-01-21T10:00:00Z",
        "error": "High response time"
      }
    }
  }
}
```

### Configuration Status

Check which integrations are enabled:

```http
GET /api/integrations/status
Authorization: Bearer <admin-token>
```

## Service Providers

### Property Valuation Services

#### European Property Data (EPD)
- **Coverage**: All EU countries
- **Features**: Automated valuations, comparable properties, market trends
- **API Documentation**: https://docs.europeanpropertydata.com
- **Pricing**: Pay-per-request model

#### Property Radar
- **Coverage**: Germany, France, Spain, Italy
- **Features**: Real-time valuations, investment analysis
- **API Documentation**: https://docs.propertyradar.eu
- **Pricing**: Subscription-based

### Mortgage Broker Services

#### EU Mortgage Broker
- **Coverage**: All EU countries
- **Features**: Multi-lender quotes, pre-approval, rate comparison
- **API Documentation**: https://docs.eumortgagebroker.com
- **Pricing**: Commission-based

#### Mortgage Finder
- **Coverage**: Germany, Netherlands, Belgium
- **Features**: Specialized local lenders, competitive rates
- **API Documentation**: https://docs.mortgagefinder.eu
- **Pricing**: Fixed fee per quote

### Legal Services

#### EU Legal Services
- **Coverage**: All EU countries
- **Features**: Lawyer directory, cost estimation, multilingual support
- **API Documentation**: https://docs.eulegalservices.com
- **Pricing**: Directory access fee

### Payment Gateways

#### Stripe
- **Coverage**: Global
- **Features**: Cards, SEPA, local payment methods
- **API Documentation**: https://stripe.com/docs
- **Pricing**: 2.9% + €0.25 per transaction

#### Adyen
- **Coverage**: Global
- **Features**: Local payment methods, fraud protection
- **API Documentation**: https://docs.adyen.com
- **Pricing**: Custom pricing

### Location Services

#### Google Maps
- **Coverage**: Global
- **Features**: Geocoding, reverse geocoding, places API
- **API Documentation**: https://developers.google.com/maps
- **Pricing**: Pay-per-use with free tier

### Communication Services

#### SendGrid
- **Coverage**: Global
- **Features**: Transactional emails, templates, analytics
- **API Documentation**: https://docs.sendgrid.com
- **Pricing**: Free tier + pay-per-email

#### Twilio
- **Coverage**: Global
- **Features**: SMS, voice, WhatsApp
- **API Documentation**: https://www.twilio.com/docs
- **Pricing**: Pay-per-message

## Error Handling

All integration services implement comprehensive error handling:

1. **Retry Logic**: Automatic retries with exponential backoff
2. **Circuit Breaker**: Prevents cascading failures
3. **Fallback Mechanisms**: Graceful degradation when services are unavailable
4. **Error Logging**: Detailed error tracking and monitoring

### Common Error Codes

- `INTEGRATION_UNAVAILABLE`: Service is temporarily unavailable
- `API_KEY_INVALID`: Invalid or expired API key
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded
- `INVALID_REQUEST`: Request validation failed
- `SERVICE_ERROR`: Internal service error

## Caching Strategy

Integration responses are cached to improve performance and reduce API costs:

- **Property Valuations**: 30 minutes cache
- **Mortgage Quotes**: 15 minutes cache
- **Legal Services**: 1 hour cache
- **Payment Methods**: 2 hours cache
- **Geocoding**: 24 hours cache

## Security Considerations

1. **API Key Management**: Store API keys securely in environment variables
2. **Request Validation**: All requests are validated before forwarding
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Data Encryption**: Sensitive data is encrypted in transit and at rest
5. **Access Control**: Integration endpoints require authentication

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=integration
```

### Integration Tests
```bash
npm run test:integration
```

### Mock Services
For development and testing, mock services are available:
```bash
npm run start:mocks
```

## Monitoring and Analytics

- **Response Times**: Track API response times
- **Success Rates**: Monitor success/failure rates
- **Usage Analytics**: Track API usage patterns
- **Cost Monitoring**: Monitor API costs and usage limits

## Support and Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify the API key is correct
   - Check if the key has expired
   - Ensure proper permissions are set

2. **Service Unavailable**
   - Check service status pages
   - Verify network connectivity
   - Review error logs

3. **Rate Limiting**
   - Implement proper caching
   - Consider upgrading API plans
   - Implement request queuing

### Getting Help

- Check service provider documentation
- Review error logs in the admin dashboard
- Contact support teams for specific integrations
- Use the health check endpoints to diagnose issues

## Future Enhancements

Planned improvements for third-party integrations:

1. **Additional Providers**: More regional service providers
2. **Enhanced Caching**: Intelligent cache invalidation
3. **Real-time Updates**: WebSocket connections for real-time data
4. **Machine Learning**: Predictive analytics for better recommendations
5. **Blockchain Integration**: Property ownership verification