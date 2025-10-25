import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@eu-real-estate/database';
import { UserRole, PropertyType, ListingType, PropertyStatus } from '@eu-real-estate/database';
import app from '../main';

// Mock AWS S3 service
jest.mock('../services/file-upload.service', () => ({
  FileUploadService: {
    uploadPropertyImage: jest.fn().mockResolvedValue({
      url: 'https://test-bucket.s3.amazonaws.com/test-image.jpg',
      key: 'properties/test-id/images/test-image.jpg',
      size: 1024,
      contentType: 'image/jpeg',
    }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Property API', () => {
  let agentToken: string;
  let buyerToken: string;
  let agentId: string;
  let buyerId: string;
  let testPropertyId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.propertyFavorite.deleteMany();
    await prisma.propertyImage.deleteMany();
    await prisma.propertyDocument.deleteMany();
    await prisma.propertyAmenity.deleteMany();
    await prisma.propertyFeatures.deleteMany();
    await prisma.propertyLocation.deleteMany();
    await prisma.propertyAddress.deleteMany();
    await prisma.property.deleteMany();
    await prisma.userVerification.deleteMany();
    await prisma.userPreferences.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const agent = await prisma.user.create({
      data: {
        email: 'agent@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        firstName: 'Agent',
        lastName: 'Smith',
        role: UserRole.AGENT,
        isVerified: true,
        profile: { create: {} },
        preferences: { create: {} },
        verification: { create: {} },
      },
    });

    const buyer = await prisma.user.create({
      data: {
        email: 'buyer@example.com',
        passwordHash: await bcrypt.hash('password123', 12),
        firstName: 'John',
        lastName: 'Buyer',
        role: UserRole.BUYER,
        isVerified: true,
        profile: { create: {} },
        preferences: { create: {} },
        verification: { create: {} },
      },
    });

    agentId = agent.id;
    buyerId = buyer.id;

    // Generate tokens
    agentToken = jwt.sign(
      {
        userId: agent.id,
        email: agent.email,
        role: agent.role,
        isVerified: agent.isVerified,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    buyerToken = jwt.sign(
      {
        userId: buyer.id,
        email: buyer.email,
        role: buyer.role,
        isVerified: buyer.isVerified,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/properties', () => {
    const validPropertyData = {
      title: 'Beautiful Apartment in Berlin',
      description: 'A stunning 2-bedroom apartment in the heart of Berlin with modern amenities and excellent location.',
      price: 450000,
      currency: 'EUR',
      propertyType: PropertyType.APARTMENT,
      listingType: ListingType.SALE,
      address: {
        street: '123 Main Street',
        city: 'Berlin',
        postcode: '10115',
        county: 'Berlin',
        country: 'DE',
      },
      location: {
        latitude: 52.5200,
        longitude: 13.4050,
      },
      features: {
        bedrooms: 2,
        bathrooms: 1,
        floorArea: 85,
        furnished: true,
        parking: true,
        balcony: true,
      },
      amenities: ['Swimming Pool', 'Gym', 'Concierge'],
    };

    it('should create property successfully for agent', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(validPropertyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.property).toMatchObject({
        title: validPropertyData.title,
        description: validPropertyData.description,
        price: validPropertyData.price.toString(), // Prisma returns Decimal as string
        propertyType: validPropertyData.propertyType,
        listingType: validPropertyData.listingType,
        status: PropertyStatus.DRAFT,
        ownerId: agentId,
      });

      expect(response.body.data.property.address).toMatchObject(validPropertyData.address);
      expect(response.body.data.property.features).toMatchObject(validPropertyData.features);
      expect(response.body.data.property.amenities).toHaveLength(3);

      testPropertyId = response.body.data.property.id;
    });

    it('should reject property creation for buyer', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(validPropertyData)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject property creation without authentication', async () => {
      const response = await request(app)
        .post('/api/properties')
        .send(validPropertyData)
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validPropertyData };
      delete invalidData.title;

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate property type enum', async () => {
      const invalidData = { ...validPropertyData, propertyType: 'INVALID_TYPE' };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${agentToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/properties', () => {
    beforeEach(async () => {
      // Create test properties
      await prisma.property.create({
        data: {
          title: 'Test Property 1',
          description: 'Description for test property 1',
          price: 300000,
          propertyType: PropertyType.APARTMENT,
          listingType: ListingType.SALE,
          status: PropertyStatus.ACTIVE,
          ownerId: agentId,
          publishedAt: new Date(),
          address: {
            create: {
              street: '123 Test Street',
              city: 'Berlin',
              postcode: '10115',
              country: 'DE',
            },
          },
          features: {
            create: {
              bedrooms: 2,
              bathrooms: 1,
              floorArea: 80,
            },
          },
        },
      });

      await prisma.property.create({
        data: {
          title: 'Test Property 2',
          description: 'Description for test property 2',
          price: 500000,
          propertyType: PropertyType.HOUSE,
          listingType: ListingType.SALE,
          status: PropertyStatus.ACTIVE,
          ownerId: agentId,
          publishedAt: new Date(),
          address: {
            create: {
              street: '456 Test Avenue',
              city: 'Munich',
              postcode: '80331',
              country: 'DE',
            },
          },
          features: {
            create: {
              bedrooms: 3,
              bathrooms: 2,
              floorArea: 120,
            },
          },
        },
      });
    });

    it('should get all active properties', async () => {
      const response = await request(app)
        .get('/api/properties')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });

    it('should filter properties by property type', async () => {
      const response = await request(app)
        .get('/api/properties?propertyType=APARTMENT')
        .expect(200);

      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.properties[0].propertyType).toBe(PropertyType.APARTMENT);
    });

    it('should filter properties by price range', async () => {
      const response = await request(app)
        .get('/api/properties?minPrice=400000&maxPrice=600000')
        .expect(200);

      expect(response.body.data.properties).toHaveLength(1);
      expect(parseFloat(response.body.data.properties[0].price)).toBe(500000);
    });

    it('should filter properties by city', async () => {
      const response = await request(app)
        .get('/api/properties?city=Berlin')
        .expect(200);

      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.properties[0].address.city).toBe('Berlin');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/properties?page=1&limit=1')
        .expect(200);

      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(1);
      expect(response.body.data.hasMore).toBe(true);
    });

    it('should sort properties by price', async () => {
      const response = await request(app)
        .get('/api/properties?sortBy=price&sortOrder=asc')
        .expect(200);

      expect(response.body.data.properties).toHaveLength(2);
      expect(parseFloat(response.body.data.properties[0].price)).toBe(300000);
      expect(parseFloat(response.body.data.properties[1].price)).toBe(500000);
    });
  });

  describe('GET /api/properties/:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await prisma.property.create({
        data: {
          title: 'Test Property',
          description: 'Test description',
          price: 300000,
          propertyType: PropertyType.APARTMENT,
          listingType: ListingType.SALE,
          status: PropertyStatus.ACTIVE,
          ownerId: agentId,
          publishedAt: new Date(),
          address: {
            create: {
              street: '123 Test Street',
              city: 'Berlin',
              postcode: '10115',
              country: 'DE',
            },
          },
        },
      });
      propertyId = property.id;
    });

    it('should get property by ID', async () => {
      const response = await request(app)
        .get(`/api/properties/${propertyId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.property.id).toBe(propertyId);
      expect(response.body.data.property.title).toBe('Test Property');
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/properties/${fakeId}`)
        .expect(404);

      expect(response.body.error.code).toBe('PROPERTY_NOT_FOUND');
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/properties/invalid-id')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/properties/:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await prisma.property.create({
        data: {
          title: 'Original Title',
          description: 'Original description',
          price: 300000,
          propertyType: PropertyType.APARTMENT,
          listingType: ListingType.SALE,
          status: PropertyStatus.DRAFT,
          ownerId: agentId,
          address: {
            create: {
              street: '123 Test Street',
              city: 'Berlin',
              postcode: '10115',
              country: 'DE',
            },
          },
        },
      });
      propertyId = property.id;
    });

    it('should update property successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        price: 350000,
        status: PropertyStatus.ACTIVE,
      };

      const response = await request(app)
        .put(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.property.title).toBe('Updated Title');
      expect(parseFloat(response.body.data.property.price)).toBe(350000);
      expect(response.body.data.property.status).toBe(PropertyStatus.ACTIVE);
      expect(response.body.data.property.publishedAt).toBeTruthy();
    });

    it('should reject update from non-owner', async () => {
      const updateData = { title: 'Unauthorized Update' };

      const response = await request(app)
        .put(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { title: 'Updated Title' };

      const response = await request(app)
        .put(`/api/properties/${fakeId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error.code).toBe('PROPERTY_NOT_FOUND');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await prisma.property.create({
        data: {
          title: 'Property to Delete',
          description: 'This property will be deleted',
          price: 300000,
          propertyType: PropertyType.APARTMENT,
          listingType: ListingType.SALE,
          status: PropertyStatus.DRAFT,
          ownerId: agentId,
          address: {
            create: {
              street: '123 Test Street',
              city: 'Berlin',
              postcode: '10115',
              country: 'DE',
            },
          },
        },
      });
      propertyId = property.id;
    });

    it('should delete property successfully', async () => {
      const response = await request(app)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Property deleted successfully');

      // Verify property is deleted
      const deletedProperty = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      expect(deletedProperty).toBeNull();
    });

    it('should reject deletion from non-owner', async () => {
      const response = await request(app)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('GET /api/properties/featured', () => {
    beforeEach(async () => {
      // Create featured and non-featured properties
      await prisma.property.create({
        data: {
          title: 'Featured Property 1',
          description: 'Featured property description',
          price: 400000,
          propertyType: PropertyType.APARTMENT,
          listingType: ListingType.SALE,
          status: PropertyStatus.ACTIVE,
          isFeatured: true,
          ownerId: agentId,
          publishedAt: new Date(),
          address: {
            create: {
              street: '123 Featured Street',
              city: 'Berlin',
              postcode: '10115',
              country: 'DE',
            },
          },
        },
      });

      await prisma.property.create({
        data: {
          title: 'Regular Property',
          description: 'Regular property description',
          price: 300000,
          propertyType: PropertyType.APARTMENT,
          listingType: ListingType.SALE,
          status: PropertyStatus.ACTIVE,
          isFeatured: false,
          ownerId: agentId,
          publishedAt: new Date(),
          address: {
            create: {
              street: '456 Regular Street',
              city: 'Berlin',
              postcode: '10115',
              country: 'DE',
            },
          },
        },
      });
    });

    it('should get only featured properties', async () => {
      const response = await request(app)
        .get('/api/properties/featured')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.properties[0].isFeatured).toBe(true);
      expect(response.body.data.properties[0].title).toBe('Featured Property 1');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/properties/featured?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/properties/my', () => {
    beforeEach(async () => {
      // Create properties for agent
      await prisma.property.create({
        data: {
          title: 'Agent Property 1',
          description: 'Property owned by agent',
          price: 300000,
          propertyType: PropertyType.APARTMENT,
          listingType: ListingType.SALE,
          status: PropertyStatus.ACTIVE,
          ownerId: agentId,
          address: {
            create: {
              street: '123 Agent Street',
              city: 'Berlin',
              postcode: '10115',
              country: 'DE',
            },
          },
        },
      });

      await prisma.property.create({
        data: {
          title: 'Agent Property 2',
          description: 'Another property owned by agent',
          price: 400000,
          propertyType: PropertyType.HOUSE,
          listingType: ListingType.SALE,
          status: PropertyStatus.DRAFT,
          ownerId: agentId,
          address: {
            create: {
              street: '456 Agent Avenue',
              city: 'Munich',
              postcode: '80331',
              country: 'DE',
            },
          },
        },
      });
    });

    it('should get current user properties', async () => {
      const response = await request(app)
        .get('/api/properties/my')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(2);
      expect(response.body.data.properties.every((p: any) => p.ownerId === agentId)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/properties/my')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });
});