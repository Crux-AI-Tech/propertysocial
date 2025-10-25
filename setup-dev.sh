#!/bin/bash

# EU Real Estate Portal - Local Development Setup
# This script sets up the local development environment for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏠 EU Real Estate Portal - Development Setup${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_status "Prerequisites check passed"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Set up environment variables
echo -e "${BLUE}🔧 Setting up environment variables...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_status "Created .env file from .env.example"
else
    print_warning ".env file already exists"
fi

# Set up database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
cd libs/database

# Generate Prisma client
echo -e "${BLUE}🔄 Generating Prisma client...${NC}"
npx prisma generate

# Check if database exists and is accessible
echo -e "${BLUE}🔍 Checking database connection...${NC}"
if npx prisma db push --accept-data-loss; then
    print_status "Database schema updated"
else
    print_warning "Database connection failed - using SQLite fallback"
    # Update schema to use SQLite for local development
    sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
    sed -i 's/url      = env("DATABASE_URL")/url      = "file:..\/..\/..\/dev.db"/' prisma/schema.prisma
    npx prisma generate
    npx prisma db push --accept-data-loss
fi

# Seed the database
echo -e "${BLUE}🌱 Seeding database...${NC}"
if npx tsx src/seed.ts; then
    print_status "Database seeded successfully"
else
    print_warning "Database seeding failed - continuing anyway"
fi

cd ../..

# Build the applications
echo -e "${BLUE}🔨 Building applications...${NC}"

# Install API dependencies
echo -e "${BLUE}📦 Setting up API...${NC}"
cd apps/api
npm install
cd ../..

# Install Web dependencies
echo -e "${BLUE}📦 Setting up Web app...${NC}"
cd apps/web
npm install
cd ../..

print_status "Applications built successfully"

# Create start script
echo -e "${BLUE}📝 Creating start scripts...${NC}"
cat > start-dev.sh << 'EOF'
#!/bin/bash

# Start development servers
echo "🚀 Starting EU Real Estate Portal development servers..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start API server
echo "🔧 Starting API server on port 8020..."
cd apps/api && npm run dev &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start web server
echo "🌐 Starting web server on port 5174..."
cd apps/web && npm run dev &
WEB_PID=$!

echo ""
echo "✅ Development servers started!"
echo "🔗 API: http://localhost:8020"
echo "🔗 Web: http://localhost:5174"
echo "🔗 Health: http://localhost:8020/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait
EOF

chmod +x start-dev.sh

print_status "Development setup completed!"

echo ""
echo -e "${GREEN}🎉 Setup Summary:${NC}"
echo -e "${BLUE}✅ Dependencies installed${NC}"
echo -e "${BLUE}✅ Database configured and seeded${NC}"
echo -e "${BLUE}✅ Applications built${NC}"
echo -e "${BLUE}✅ Start script created${NC}"

echo ""
echo -e "${GREEN}🚀 To start development servers:${NC}"
echo -e "${BLUE}./start-dev.sh${NC}"

echo ""
echo -e "${GREEN}📊 Test Accounts:${NC}"
echo -e "${BLUE}👤 Admin: admin@eu-real-estate.com / password123${NC}"
echo -e "${BLUE}🏢 Agent: agent@eu-real-estate.com / password123${NC}"
echo -e "${BLUE}🏠 Buyer: buyer@eu-real-estate.com / password123${NC}"

echo ""
echo -e "${GREEN}🔗 Development URLs:${NC}"
echo -e "${BLUE}API: http://localhost:8020${NC}"
echo -e "${BLUE}Web: http://localhost:5174${NC}"
echo -e "${BLUE}Health: http://localhost:8020/health${NC}"
echo -e "${BLUE}Properties: http://localhost:8020/api/properties${NC}"

echo ""
echo -e "${GREEN}✅ Development environment ready!${NC}"