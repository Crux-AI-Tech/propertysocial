const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 7500;

console.log('🔍 Debug - PORT from env:', process.env.PORT);
console.log('🔍 Debug - Final PORT value:', PORT);

// Basic middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:6500',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

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

// Mock properties endpoint
app.get('/api/properties', (req, res) => {
  res.json({
    success: true,
    data: {
      properties: [
        {
          id: '1',
          title: 'Beautiful Apartment in Berlin Mitte',
          description: 'A stunning 2-bedroom apartment in the heart of Berlin with modern amenities.',
          price: 450000,
          currency: 'EUR',
          propertyType: 'APARTMENT',
          city: 'Berlin',
          country: 'DE',
          bedrooms: 2,
          bathrooms: 1,
          floorArea: 85,
          images: [
            {
              id: '1',
              url: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800',
              altText: 'Living room view',
              isMain: true
            }
          ],
          owner: {
            firstName: 'Jane',
            lastName: 'Agent',
            email: 'agent@eu-real-estate.com'
          },
          tags: [
            {
              tag: {
                name: 'Modern',
                color: '#4A90E2'
              }
            }
          ]
        },
        {
          id: '2',
          title: 'Luxury Penthouse in Munich',
          description: 'Exclusive penthouse with panoramic city views and premium finishes.',
          price: 1200000,
          currency: 'EUR',
          propertyType: 'APARTMENT',
          city: 'Munich',
          country: 'DE',
          bedrooms: 3,
          bathrooms: 2,
          floorArea: 150,
          images: [
            {
              id: '2',
              url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
              altText: 'Penthouse living area',
              isMain: true
            }
          ],
          owner: {
            firstName: 'Jane',
            lastName: 'Agent',
            email: 'agent@eu-real-estate.com'
          },
          tags: [
            {
              tag: {
                name: 'Luxury',
                color: '#FFD700'
              }
            }
          ]
        },
        {
          id: '3',
          title: 'Charming House in Hamburg',
          description: 'Traditional German house with garden, perfect for families.',
          price: 680000,
          currency: 'EUR',
          propertyType: 'HOUSE',
          city: 'Hamburg',
          country: 'DE',
          bedrooms: 4,
          bathrooms: 2,
          floorArea: 180,
          images: [
            {
              id: '3',
              url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
              altText: 'House exterior',
              isMain: true
            }
          ],
          owner: {
            firstName: 'Jane',
            lastName: 'Agent',
            email: 'agent@eu-real-estate.com'
          },
          tags: [
            {
              tag: {
                name: 'Family Friendly',
                color: '#50C878'
              }
            }
          ]
        }
      ],
      total: 3
    }
  });
});

// Mock auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  // Mock authentication - accept demo credentials
  const validCredentials = [
    { email: 'admin@eu-real-estate.com', password: 'password123', role: 'ADMIN' },
    { email: 'agent@eu-real-estate.com', password: 'password123', role: 'AGENT' },
    { email: 'buyer@eu-real-estate.com', password: 'password123', role: 'BUYER' }
  ];

  const user = validCredentials.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: '1',
        email: user.email,
        firstName: user.role === 'ADMIN' ? 'Admin' : user.role === 'AGENT' ? 'Jane' : 'John',
        lastName: user.role === 'ADMIN' ? 'User' : user.role === 'AGENT' ? 'Agent' : 'Buyer',
        role: user.role
      },
      token: 'mock-jwt-token',
    },
  });
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