import request from 'supertest';
import { testPrisma, setupMocks } from './setup';
import app from '../main';

// Setup mocks
setupMocks();

describe('End-to-End Tests', () => {
  let agentToken: string;
  let buyerToken: string;
  let agentId: string;
  let buyerId: string;
  let propertyId: string;

  beforeAll(async () => {
    // Create test users
    const agent = await testPrisma.user.create({
      data: {
        email: 'e2e-agent@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'E2E',
        lastName: 'Agent',
        role: 'AGENT',
        status: 'ACTIVE',
        country: 'DE',
        language: 'en',
        emailVerified: true,
      },
    });

    const buyer = await testPrisma.user.create({
      data: {
        email: 'e2e-buyer@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'E2E',
        lastName: 'Buyer',
        role: 'BUYER',
        status: 'ACTIVE',
        country: 'DE',
        language: 'en',
        emailVerified: true,
      },
    });

    agentId = agent.id;
    buyerId = buyer.id;

    // Login to get tokens
    const agentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'e2e-agent@test.com',
        password: 'password123',
      });

    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'e2e-buyer@test.com',
        password: 'password123',
      });

    agentToken = agentLogin.body.data.tokens.accessToken;
    buyerToken = buyerLogin.body.data.tokens.accessToken;
  });

  describe('Complete Property Listing Workflow', () => {
    it('should complete the full property listing workflow', async () => {
      // Step 1: Agent creates a property listing
      const propertyData = {
        title: 'E2E Test Property',
        description: 'A beautiful property for end-to-end testing',
        propertyType: 'APARTMENT',
        price: 450000,
        currency: 'EUR',
        size: 85,
        bedrooms: 2,
        bathrooms: 1,
        address: 'E2E Test Street 1',
        city: 'Berlin',
        country: 'DE',
        postalCode: '10117',
        latitude: 52.5162746,
        longitude: 13.3777041,
      };

      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(propertyData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.property.status).toBe('DRAFT');
      propertyId = createResponse.body.data.property.id;

      // Step 2: Agent gets property valuation
      const valuationResponse = await request(app)
        .post('/api/integrations/property/valuation')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          address: propertyData.address,
          propertyType: propertyData.propertyType,
          size: propertyData.size,
          country: propertyData.country,
        })
        .expect(200);

      expect(valuationResponse.body.success).toBe(true);
      expect(valuationResponse.body.data.valuations).toBeDefined();

      // Step 3: Agent geocodes the property address
      const geocodeResponse = await request(app)
        .post('/api/integrations/geocode')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          address: `${propertyData.address}, ${propertyData.city}`,
          country: propertyData.country,
        })
        .expect(200);

      expect(geocodeResponse.body.success).toBe(true);
      expect(geocodeResponse.body.data.lat).toBeDefined();
      expect(geocodeResponse.body.data.lng).toBeDefined();

      // Step 4: Agent updates property with geocoded coordinates and publishes
      const updateResponse = await request(app)
        .put(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          latitude: geocodeResponse.body.data.lat,
          longitude: geocodeResponse.body.data.lng,
          status: 'ACTIVE',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.property.status).toBe('ACTIVE');

      // Step 5: Buyer searches for properties
      const searchResponse = await request(app)
        .get('/api/properties')
        .query({
          city: 'Berlin',
          minPrice: 400000,
          maxPrice: 500000,
          propertyType: 'APARTMENT',
        })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.properties.length).toBeGreaterThan(0);
      
      const foundProperty = searchResponse.body.data.properties.find(
        (p: any) => p.id === propertyId
      );
      expect(foundProperty).toBeDefined();

      // Step 6: Buyer views property details
      const detailsResponse = await request(app)
        .get(`/api/properties/${propertyId}`)
        .expect(200);

      expect(detailsResponse.body.success).toBe(true);
      expect(detailsResponse.body.data.property.title).toBe(propertyData.title);

      // Step 7: Buyer gets mortgage quotes
      const mortgageResponse = await request(app)
        .post('/api/integrations/mortgage/quotes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          propertyValue: propertyData.price,
          downPayment: propertyData.price * 0.2,
          income: 75000,
          country: propertyData.country,
          currency: propertyData.currency,
        })
        .expect(200);

      expect(mortgageResponse.body.success).toBe(true);
      expect(mortgageResponse.body.data.quotes).toBeDefined();

      // Step 8: Buyer creates a transaction (offer)
      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          propertyId,
          offerAmount: propertyData.price * 0.95, // 5% below asking price
          currency: propertyData.currency,
          message: 'I would like to make an offer on this property',
        })
        .expect(201);

      expect(transactionResponse.body.success).toBe(true);
      expect(transactionResponse.body.data.transaction.status).toBe('PENDING');

      // Step 9: Agent views the transaction
      const agentTransactionResponse = await request(app)
        .get(`/api/transactions/${transactionResponse.body.data.transaction.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(agentTransactionResponse.body.success).toBe(true);
      expect(agentTransactionResponse.body.data.transaction.buyerId).toBe(buyerId);

      // Step 10: Agent accepts the offer
      const acceptResponse = await request(app)
        .put(`/api/transactions/${transactionResponse.body.data.transaction.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'ACCEPTED',
          agentNotes: 'Offer accepted, proceeding with transaction',
        })
        .expect(200);

      expect(acceptResponse.body.success).toBe(true);
      expect(acceptResponse.body.data.transaction.status).toBe('ACCEPTED');

      // Step 11: Get legal services for the transaction
      const legalResponse = await request(app)
        .get('/api/integrations/legal/services')
        .query({
          serviceType: 'conveyancing',
          country: propertyData.country,
          language: 'en',
        })
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(legalResponse.body.success).toBe(true);
      expect(legalResponse.body.data.services).toBeDefined();

      // Step 12: Get payment methods
      const paymentResponse = await request(app)
        .get('/api/integrations/payment/methods')
        .query({
          country: propertyData.country,
          currency: propertyData.currency,
        })
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data.methods).toBeDefined();

      // Step 13: Send notification email
      const emailResponse = await request(app)
        .post('/api/integrations/email/send')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          to: 'e2e-buyer@test.com',
          templateId: 'offer_accepted',
          data: {
            propertyTitle: propertyData.title,
            offerAmount: propertyData.price * 0.95,
            agentName: 'E2E Agent',
          },
          language: 'en',
        })
        .expect(200);

      expect(emailResponse.body.success).toBe(true);

      // Step 14: Complete the transaction
      const completeResponse = await request(app)
        .put(`/api/transactions/${transactionResponse.body.data.transaction.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          finalAmount: propertyData.price * 0.95,
        })
        .expect(200);

      expect(completeResponse.body.success).toBe(true);
      expect(completeResponse.body.data.transaction.status).toBe('COMPLETED');

      // Step 15: Update property status to sold
      const soldResponse = await request(app)
        .put(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'SOLD',
          soldAt: new Date().toISOString(),
          soldPrice: propertyData.price * 0.95,
        })
        .expect(200);

      expect(soldResponse.body.success).toBe(true);
      expect(soldResponse.body.data.property.status).toBe('SOLD');
    });
  });

  describe('User Registration and Verification Workflow', () => {
    it('should complete user registration and verification workflow', async () => {
      const userData = {
        email: 'e2e-newuser@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        role: 'BUYER',
        country: 'DE',
        language: 'en',
      };

      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.user.emailVerified).toBe(false);
      expect(registerResponse.body.data.tokens).toBeDefined();

      const newUserToken = registerResponse.body.data.tokens.accessToken;
      const userId = registerResponse.body.data.user.id;

      // Step 2: Try to access protected resource (should work but with limited access)
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.emailVerified).toBe(false);

      // Step 3: Verify email (simulate email verification)
      const verificationToken = 'mock-verification-token';
      
      // Update user to simulate email verification
      await testPrisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          status: 'ACTIVE',
        },
      });

      // Step 4: Login with verified account
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.emailVerified).toBe(true);

      const verifiedToken = loginResponse.body.data.tokens.accessToken;

      // Step 5: Update user profile
      const updateProfileResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          phone: '+491234567890',
          bio: 'I am looking for a new apartment in Berlin',
        })
        .expect(200);

      expect(updateProfileResponse.body.success).toBe(true);

      // Step 6: Change password
      const changePasswordResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(changePasswordResponse.body.success).toBe(true);

      // Step 7: Login with new password
      const newLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'NewPassword123!',
        })
        .expect(200);

      expect(newLoginResponse.body.success).toBe(true);
    });
  });

  describe('Property Search and Filtering Workflow', () => {
    beforeAll(async () => {
      // Create multiple test properties with different characteristics
      const properties = [
        {
          title: 'Luxury Apartment Berlin Mitte',
          description: 'Luxury apartment in the heart of Berlin',
          propertyType: 'APARTMENT',
          price: 800000,
          currency: 'EUR',
          size: 120,
          bedrooms: 3,
          bathrooms: 2,
          address: 'Unter den Linden 10',
          city: 'Berlin',
          country: 'DE',
          postalCode: '10117',
          latitude: 52.5162746,
          longitude: 13.3777041,
          agentId,
          status: 'ACTIVE',
        },
        {
          title: 'Cozy Studio Berlin Kreuzberg',
          description: 'Small but cozy studio in trendy Kreuzberg',
          propertyType: 'APARTMENT',
          price: 350000,
          currency: 'EUR',
          size: 45,
          bedrooms: 1,
          bathrooms: 1,
          address: 'Oranienstraße 20',
          city: 'Berlin',
          country: 'DE',
          postalCode: '10999',
          latitude: 52.5027,
          longitude: 13.4189,
          agentId,
          status: 'ACTIVE',
        },
        {
          title: 'Family House Munich',
          description: 'Perfect family house with garden',
          propertyType: 'HOUSE',
          price: 1200000,
          currency: 'EUR',
          size: 180,
          bedrooms: 4,
          bathrooms: 3,
          address: 'Maximilianstraße 15',
          city: 'Munich',
          country: 'DE',
          postalCode: '80539',
          latitude: 48.1374,
          longitude: 11.5755,
          agentId,
          status: 'ACTIVE',
        },
      ];

      for (const property of properties) {
        await testPrisma.property.create({ data: property });
      }
    });

    it('should handle complex property search scenarios', async () => {
      // Test 1: Search by city
      const berlinResponse = await request(app)
        .get('/api/properties')
        .query({ city: 'Berlin' })
        .expect(200);

      expect(berlinResponse.body.success).toBe(true);
      expect(berlinResponse.body.data.properties.length).toBe(2);
      expect(berlinResponse.body.data.properties.every((p: any) => p.city === 'Berlin')).toBe(true);

      // Test 2: Search by price range
      const priceRangeResponse = await request(app)
        .get('/api/properties')
        .query({
          minPrice: 300000,
          maxPrice: 900000,
        })
        .expect(200);

      expect(priceRangeResponse.body.success).toBe(true);
      expect(priceRangeResponse.body.data.properties.length).toBe(2);

      // Test 3: Search by property type
      const apartmentResponse = await request(app)
        .get('/api/properties')
        .query({ propertyType: 'APARTMENT' })
        .expect(200);

      expect(apartmentResponse.body.success).toBe(true);
      expect(apartmentResponse.body.data.properties.length).toBe(2);
      expect(apartmentResponse.body.data.properties.every((p: any) => p.propertyType === 'APARTMENT')).toBe(true);

      // Test 4: Search by bedrooms
      const bedroomResponse = await request(app)
        .get('/api/properties')
        .query({ minBedrooms: 3 })
        .expect(200);

      expect(bedroomResponse.body.success).toBe(true);
      expect(bedroomResponse.body.data.properties.length).toBe(2);

      // Test 5: Complex multi-filter search
      const complexResponse = await request(app)
        .get('/api/properties')
        .query({
          city: 'Berlin',
          propertyType: 'APARTMENT',
          minPrice: 300000,
          maxPrice: 600000,
          minSize: 40,
        })
        .expect(200);

      expect(complexResponse.body.success).toBe(true);
      expect(complexResponse.body.data.properties.length).toBe(1);
      expect(complexResponse.body.data.properties[0].title).toContain('Studio');

      // Test 6: Sorting
      const sortedResponse = await request(app)
        .get('/api/properties')
        .query({
          sortBy: 'price',
          sortOrder: 'asc',
        })
        .expect(200);

      expect(sortedResponse.body.success).toBe(true);
      const prices = sortedResponse.body.data.properties.map((p: any) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));

      // Test 7: Pagination
      const paginatedResponse = await request(app)
        .get('/api/properties')
        .query({
          page: 1,
          limit: 2,
        })
        .expect(200);

      expect(paginatedResponse.body.success).toBe(true);
      expect(paginatedResponse.body.data.properties.length).toBe(2);
      expect(paginatedResponse.body.data.page).toBe(1);
      expect(paginatedResponse.body.data.totalPages).toBeGreaterThan(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Test 1: Invalid property ID
      const invalidIdResponse = await request(app)
        .get('/api/properties/invalid-id')
        .expect(400);

      expect(invalidIdResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Test 2: Non-existent property
      const nonExistentResponse = await request(app)
        .get('/api/properties/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);

      expect(nonExistentResponse.body.error.code).toBe('PROPERTY_NOT_FOUND');

      // Test 3: Unauthorized access
      const unauthorizedResponse = await request(app)
        .post('/api/properties')
        .send({
          title: 'Unauthorized Property',
          description: 'This should fail',
          price: 100000,
        })
        .expect(401);

      expect(unauthorizedResponse.body.error.code).toBe('MISSING_TOKEN');

      // Test 4: Invalid data validation
      const invalidDataResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          title: '', // Empty title
          price: -1000, // Negative price
          propertyType: 'INVALID_TYPE',
        })
        .expect(400);

      expect(invalidDataResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Test 5: Insufficient permissions
      const insufficientPermResponse = await request(app)
        .get('/api/performance/dashboard')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(insufficientPermResponse.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 concurrent requests
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/properties')
          .query({ limit: 5 })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should complete within reasonable time (adjust based on your requirements)
      expect(totalTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/properties')
        .query({ limit: 100 })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(2000); // 2 seconds
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      // Create a property
      const propertyData = {
        title: 'Consistency Test Property',
        description: 'Testing data consistency',
        propertyType: 'APARTMENT',
        price: 500000,
        currency: 'EUR',
        size: 90,
        bedrooms: 2,
        bathrooms: 1,
        address: 'Consistency Street 1',
        city: 'Berlin',
        country: 'DE',
        postalCode: '10117',
        latitude: 52.5162746,
        longitude: 13.3777041,
      };

      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(propertyData)
        .expect(201);

      const createdPropertyId = createResponse.body.data.property.id;

      // Verify property exists in database
      const dbProperty = await testPrisma.property.findUnique({
        where: { id: createdPropertyId },
      });

      expect(dbProperty).toBeDefined();
      expect(dbProperty?.title).toBe(propertyData.title);

      // Update the property
      const updateData = {
        title: 'Updated Consistency Test Property',
        price: 550000,
      };

      const updateResponse = await request(app)
        .put(`/api/properties/${createdPropertyId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.property.title).toBe(updateData.title);
      expect(updateResponse.body.data.property.price).toBe(updateData.price);

      // Verify update in database
      const updatedDbProperty = await testPrisma.property.findUnique({
        where: { id: createdPropertyId },
      });

      expect(updatedDbProperty?.title).toBe(updateData.title);
      expect(updatedDbProperty?.price).toBe(updateData.price);

      // Delete the property
      const deleteResponse = await request(app)
        .delete(`/api/properties/${createdPropertyId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion in database
      const deletedDbProperty = await testPrisma.property.findUnique({
        where: { id: createdPropertyId },
      });

      expect(deletedDbProperty).toBeNull();
    });
  });
});