// Shared types for EU Real Estate Portal

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'AGENT' | 'ADMIN';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  country: string;
  language: string;
  phone?: string;
  bio?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  propertyType: 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND';
  status: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'RENTED' | 'INACTIVE';
  price: number;
  currency: string;
  size: number;
  bedrooms?: number;
  bathrooms?: number;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  url: string;
  alt?: string;
  order: number;
  createdAt: Date;
}

export interface PropertyTag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  propertyId: string;
  buyerId: string;
  agentId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  offerAmount: number;
  currency: string;
  terms?: any;
  offerDate: Date;
  acceptanceDate?: Date;
  completionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  propertyId?: string;
  subject: string;
  content: string;
  read: boolean;
  sentAt: Date;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  criteria: any;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Favorite {
  id: string;
  userId: string;
  propertyId: string;
  notes?: string;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'BUYER' | 'AGENT';
  country: string;
  language: string;
  phone?: string;
  bio?: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// Property search types
export interface PropertySearchFilters {
  query?: string;
  city?: string;
  country?: string;
  propertyType?: 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND';
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  sortBy?: 'price' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PropertyCreateRequest {
  title: string;
  description: string;
  propertyType: 'APARTMENT' | 'HOUSE' | 'COMMERCIAL' | 'LAND';
  price: number;
  currency: string;
  size: number;
  bedrooms?: number;
  bathrooms?: number;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyUpdateRequest {
  title?: string;
  description?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'SOLD' | 'RENTED' | 'INACTIVE';
  price?: number;
  size?: number;
  bedrooms?: number;
  bathrooms?: number;
}

// Error types
export interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  type: 'application' | 'security' | 'performance' | 'business';
  error: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    url?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
    environment: string;
    version: string;
  };
  metadata?: Record<string, any>;
  fingerprint: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  assignee?: string;
  tags: string[];
}

// Analytics types
export interface UserEvent {
  userId: string;
  sessionId: string;
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
  page?: string;
}

export interface PageView {
  userId?: string;
  sessionId: string;
  page: string;
  title?: string;
  referrer?: string;
  timestamp: string;
  duration?: number;
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
}

export interface ConversionEvent {
  userId: string;
  event: string;
  value?: number;
  currency?: string;
  properties: Record<string, any>;
  timestamp: string;
  funnel?: string;
  step?: number;
}

// Monitoring types
export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  componentType: string;
  observedValue?: any;
  observedUnit?: string;
  time: string;
  output?: string;
}

export interface HealthStatus {
  status: 'pass' | 'warn' | 'fail';
  version: string;
  releaseId: string;
  notes: string[];
  output: string;
  serviceId: string;
  description: string;
  checks: Record<string, HealthCheck[]>;
}

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  system: {
    platform: string;
    arch: string;
    hostname: string;
    version: string;
  };
}