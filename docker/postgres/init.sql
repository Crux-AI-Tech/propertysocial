-- Initialize EU Real Estate Portal Database
-- This script sets up the initial database structure

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'agent', 'admin', 'developer');
CREATE TYPE property_type AS ENUM ('apartment', 'house', 'commercial', 'land', 'office', 'retail');
CREATE TYPE listing_type AS ENUM ('sale', 'rent', 'lease');
CREATE TYPE property_status AS ENUM ('active', 'pending', 'sold', 'rented', 'withdrawn', 'draft');
CREATE TYPE transaction_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled');

-- Create initial database structure (will be managed by Prisma migrations)
-- This is just for development setup