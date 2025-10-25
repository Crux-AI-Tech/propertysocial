import { PrismaClient } from './generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@eu-real-estate.com' },
    update: {},
    create: {
      email: 'admin@eu-real-estate.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
      emailVerified: true,
      country: 'DE',
      city: 'Berlin',
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: 'agent@eu-real-estate.com' },
    update: {},
    create: {
      email: 'agent@eu-real-estate.com',
      passwordHash: hashedPassword,
      firstName: 'Jane',
      lastName: 'Agent',
      role: 'AGENT',
      isVerified: true,
      emailVerified: true,
      country: 'DE',
      city: 'Berlin',
      company: 'Berlin Real Estate',
      phone: '+49 30 1234 5678',
    },
  });

  const buyerUser = await prisma.user.upsert({
    where: { email: 'buyer@eu-real-estate.com' },
    update: {},
    create: {
      email: 'buyer@eu-real-estate.com',
      passwordHash: hashedPassword,
      firstName: 'John',
      lastName: 'Buyer',
      role: 'BUYER',
      isVerified: true,
      emailVerified: true,
      country: 'DE',
      city: 'Berlin',
      phone: '+49 30 9876 5432',
    },
  });

  console.log('✅ Created users:', { adminUser: adminUser.email, agentUser: agentUser.email, buyerUser: buyerUser.email });

  // Create property tags
  const luxuryTag = await prisma.propertyTag.upsert({
    where: { name_category: { name: 'Luxury', category: 'style' } },
    update: {},
    create: {
      name: 'Luxury',
      category: 'style',
      description: 'High-end luxury properties',
      color: '#FFD700',
    },
  });

  const modernTag = await prisma.propertyTag.upsert({
    where: { name_category: { name: 'Modern', category: 'style' } },
    update: {},
    create: {
      name: 'Modern',
      category: 'style',
      description: 'Contemporary modern properties',
      color: '#4A90E2',
    },
  });

  const centralTag = await prisma.propertyTag.upsert({
    where: { name_category: { name: 'Central Location', category: 'location' } },
    update: {},
    create: {
      name: 'Central Location',
      category: 'location',
      description: 'Properties in central locations',
      color: '#50C878',
    },
  });

  console.log('✅ Created property tags');

  // Create sample properties
  const property1 = await prisma.property.create({
    data: {
      title: 'Beautiful Apartment in Berlin Mitte',
      description: 'A stunning 2-bedroom apartment in the heart of Berlin with modern amenities and excellent transport links.',
      price: 450000,
      currency: 'EUR',
      propertyType: 'APARTMENT',
      listingType: 'SALE',
      status: 'ACTIVE',
      isActive: true,
      isFeatured: true,
      ownerId: agentUser.id,
      street: 'Unter den Linden 1',
      city: 'Berlin',
      postcode: '10117',
      country: 'DE',
      latitude: 52.5162746,
      longitude: 13.3777041,
      bedrooms: 2,
      bathrooms: 1,
      floorArea: 85,
      buildYear: 2020,
      furnished: false,
      balcony: true,
      elevator: true,
      parking: false,
      publishedAt: new Date(),
    },
  });

  const property2 = await prisma.property.create({
    data: {
      title: 'Luxury Penthouse in Munich',
      description: 'Exclusive penthouse with panoramic city views, premium finishes, and private terrace.',
      price: 1200000,
      currency: 'EUR',
      propertyType: 'APARTMENT',
      listingType: 'SALE',
      status: 'ACTIVE',
      isActive: true,
      isFeatured: true,
      ownerId: agentUser.id,
      street: 'Maximilianstraße 15',
      city: 'Munich',
      postcode: '80539',
      country: 'DE',
      latitude: 48.1351,
      longitude: 11.5820,
      bedrooms: 3,
      bathrooms: 2,
      floorArea: 150,
      buildYear: 2019,
      furnished: true,
      balcony: true,
      terrace: true,
      elevator: true,
      parking: true,
      garage: true,
      airConditioning: true,
      publishedAt: new Date(),
    },
  });

  const property3 = await prisma.property.create({
    data: {
      title: 'Charming House in Hamburg',
      description: 'Traditional German house with garden, perfect for families. Recently renovated with modern amenities.',
      price: 680000,
      currency: 'EUR',
      propertyType: 'HOUSE',
      listingType: 'SALE',
      status: 'ACTIVE',
      isActive: true,
      ownerId: agentUser.id,
      street: 'Elbchaussee 42',
      city: 'Hamburg',
      postcode: '22763',
      country: 'DE',
      latitude: 53.5511,
      longitude: 9.9937,
      bedrooms: 4,
      bathrooms: 2,
      floorArea: 180,
      plotSize: 400,
      buildYear: 1995,
      furnished: false,
      garden: true,
      parking: true,
      garage: true,
      publishedAt: new Date(),
    },
  });

  console.log('✅ Created properties:', { property1: property1.title, property2: property2.title, property3: property3.title });

  // Add property tags
  await prisma.propertyToTag.createMany({
    data: [
      { propertyId: property1.id, tagId: modernTag.id },
      { propertyId: property1.id, tagId: centralTag.id },
      { propertyId: property2.id, tagId: luxuryTag.id },
      { propertyId: property2.id, tagId: modernTag.id },
      { propertyId: property2.id, tagId: centralTag.id },
      { propertyId: property3.id, tagId: centralTag.id },
    ],
  });

  // Create sample images for properties
  await prisma.propertyImage.createMany({
    data: [
      {
        propertyId: property1.id,
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        altText: 'Living room view',
        order: 1,
        isMain: true,
      },
      {
        propertyId: property1.id,
        url: 'https://images.unsplash.com/photo-1560449752-8d4b0e6e5e0e?w=800',
        altText: 'Kitchen view',
        order: 2,
        isMain: false,
      },
      {
        propertyId: property2.id,
        url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
        altText: 'Penthouse living area',
        order: 1,
        isMain: true,
      },
      {
        propertyId: property2.id,
        url: 'https://images.unsplash.com/photo-1560448075-cbc16bb4af8e?w=800',
        altText: 'Terrace view',
        order: 2,
        isMain: false,
      },
      {
        propertyId: property3.id,
        url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
        altText: 'House exterior',
        order: 1,
        isMain: true,
      },
      {
        propertyId: property3.id,
        url: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800',
        altText: 'Garden view',
        order: 2,
        isMain: false,
      },
    ],
  });

  console.log('✅ Added property images');

  // Create a sample saved search
  await prisma.savedSearch.create({
    data: {
      userId: buyerUser.id,
      name: 'Berlin Apartments Under 500k',
      criteria: JSON.stringify({
        city: 'Berlin',
        propertyType: 'APARTMENT',
        maxPrice: 500000,
        minBedrooms: 2,
      }),
      isActive: true,
    },
  });

  // Create a sample favorite
  await prisma.propertyFavorite.create({
    data: {
      userId: buyerUser.id,
      propertyId: property1.id,
      notes: 'Great location and price!',
    },
  });

  console.log('✅ Created saved search and favorite');

  // Create a sample transaction
  const transaction = await prisma.transaction.create({
    data: {
      propertyId: property1.id,
      buyerId: buyerUser.id,
      sellerId: agentUser.id,
      agentId: agentUser.id,
      type: 'PURCHASE',
      status: 'PENDING',
      offerAmount: 440000,
      currency: 'EUR',
      offerDate: new Date(),
      notes: 'Initial offer submitted',
    },
  });

  // Create a sample offer
  await prisma.offer.create({
    data: {
      transactionId: transaction.id,
      offererId: buyerUser.id,
      amount: 440000,
      currency: 'EUR',
      status: 'PENDING',
      message: 'I would like to make an offer on this beautiful apartment.',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  console.log('✅ Created transaction and offer');

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: agentUser.id,
        type: 'IN_APP',
        status: 'PENDING',
        title: 'New Offer Received',
        content: 'You have received a new offer for your property in Berlin Mitte.',
        data: JSON.stringify({ propertyId: property1.id, transactionId: transaction.id }),
      },
      {
        userId: buyerUser.id,
        type: 'EMAIL',
        status: 'SENT',
        title: 'Offer Submitted Successfully',
        content: 'Your offer for the apartment in Berlin Mitte has been submitted.',
        data: JSON.stringify({ propertyId: property1.id, transactionId: transaction.id }),
        sentAt: new Date(),
      },
    ],
  });

  console.log('✅ Created notifications');

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Test accounts created:');
  console.log('👤 Admin: admin@eu-real-estate.com / password123');
  console.log('🏢 Agent: agent@eu-real-estate.com / password123');
  console.log('🏠 Buyer: buyer@eu-real-estate.com / password123');
  console.log('');
  console.log('🏘️  Sample properties created in Berlin, Munich, and Hamburg');
  console.log('💼 Sample transaction and offer created');
  console.log('🔔 Sample notifications created');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });