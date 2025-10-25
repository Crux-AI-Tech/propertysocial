import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 7500;

console.log('🔍 Debug - PORT from env:', process.env.PORT);
console.log('🔍 Debug - Final PORT value:', PORT);

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:6500',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Basic API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'EU Real Estate Portal API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    // Import Prisma client directly
    const { PrismaClient } = await import('../../../libs/database/src/generated/client');
    const prisma = new PrismaClient();

    // Test database connection
    const userCount = await prisma.user.count();
    const propertyCount = await prisma.property.count();

    await prisma.$disconnect();

    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        users: userCount,
        properties: propertyCount,
      },
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// Get properties endpoint
app.get('/api/properties', async (req, res) => {
  try {
    const { PrismaClient } = await import('../../../libs/database/src/generated/client');
    const prisma = new PrismaClient();

    const properties = await prisma.property.findMany({
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        images: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      data: {
        properties,
        total: properties.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties',
      error: error.message,
    });
  }
});

// Get property by ID
app.get('/api/properties/:id', async (req, res) => {
  try {
    const { PrismaClient } = await import('../../../libs/database/src/generated/client');
    const prisma = new PrismaClient();
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            phone: true,
            company: true,
          },
        },
        images: {
          orderBy: {
            order: 'asc',
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!property) {
      await prisma.$disconnect();
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Increment view count
    await prisma.property.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      data: {
        property,
      },
    });
  } catch (error: any) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: error.message,
    });
  }
});

// Basic auth endpoint for testing
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const { PrismaClient } = await import('../../../libs/database/src/generated/client');
    const prisma = new PrismaClient();
    const bcrypt = await import('bcryptjs');

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await prisma.$disconnect();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      await prisma.$disconnect();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    await prisma.$disconnect();

    // Return user data (without password)
    const { passwordHash, ...userData } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        // In a real app, you'd generate a JWT token here
        token: 'mock-jwt-token',
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EU Real Estate API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🏠 Properties: http://localhost:${PORT}/api/properties`);
  console.log(`🔐 Test login with: admin@eu-real-estate.com / password123`);
});

export default app;