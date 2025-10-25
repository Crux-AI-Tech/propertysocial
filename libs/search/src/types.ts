import { PropertyType, ListingType } from '@eu-real-estate/database';

// Search query types
export interface PropertySearchQuery {
  query?: string;
  propertyType?: PropertyType[];
  listingType?: ListingType;
  priceMin?: number;
  priceMax?: number;
  bedroomsMin?: number;
  bedroomsMax?: number;
  bathroomsMin?: number;
  bathroomsMax?: number;
  floorAreaMin?: number;
  floorAreaMax?: number;
  country?: string;
  city?: string;
  radius?: number;
  location?: {
    lat: number;
    lon: number;
  };
  features?: {
    garden?: boolean;
    parking?: boolean;
    furnished?: boolean;
    petFriendly?: boolean;
    balcony?: boolean;
    terrace?: boolean;
    elevator?: boolean;
    airConditioning?: boolean;
  };
  amenities?: string[];
  sortBy?: 'price' | 'createdAt' | 'viewCount' | '_score';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Search result types
export interface PropertySearchResult {
  properties: PropertySearchHit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  aggregations?: PropertySearchAggregations;
}

export interface PropertySearchHit {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  propertyType: PropertyType;
  listingType: ListingType;
  bedrooms?: number;
  bathrooms?: number;
  floorArea?: number;
  address: {
    street: string;
    city: string;
    postcode: string;
    country: string;
  };
  location?: {
    lat: number;
    lon: number;
  };
  features: Record<string, boolean | string | number | null>;
  amenities: string[];
  images: Array<{
    url: string;
    isMain: boolean;
  }>;
  owner: {
    id: string;
    name: string;
    company?: string;
  };
  createdAt: string;
  updatedAt: string;
  score?: number;
}

export interface PropertySearchAggregations {
  propertyTypes?: {
    [key in PropertyType]?: number;
  };
  listingTypes?: {
    [key in ListingType]?: number;
  };
  priceRanges?: Array<{
    from?: number;
    to?: number;
    count: number;
  }>;
  cities?: Array<{
    key: string;
    count: number;
  }>;
  countries?: Array<{
    key: string;
    count: number;
  }>;
  features?: {
    [key: string]: number;
  };
  amenities?: Array<{
    key: string;
    count: number;
  }>;
}

// Analytics types
export interface PropertyAnalytics {
  averagePrice: number;
  medianPrice: number;
  pricePerSquareMeter: number;
  listingCount: number;
  averageDaysOnMarket: number;
  priceDistribution: {
    min: number;
    max: number;
    ranges: Array<{
      from: number;
      to: number;
      count: number;
    }>;
  };
  popularFeatures: Array<{
    feature: string;
    count: number;
    percentage: number;
  }>;
}

export interface MarketTrends {
  period: 'week' | 'month' | 'quarter' | 'year';
  data: Array<{
    date: string;
    averagePrice: number;
    listingCount: number;
    salesCount?: number;
  }>;
  changePercentage: number;
}

export interface PropertyRecommendation {
  id: string;
  title: string;
  price: number;
  currency: string;
  propertyType: PropertyType;
  listingType: ListingType;
  image?: string;
  address: {
    city: string;
    country: string;
  };
  score: number;
  matchReason: string;
}

// Indexing types
export interface PropertyIndexDocument {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  propertyType: string;
  listingType: string;
  status: string;
  bedrooms?: number;
  bathrooms?: number;
  floorArea?: number;
  address: {
    street: string;
    city: string;
    postcode: string;
    county?: string;
    country: string;
  };
  location?: {
    lat: number;
    lon: number;
  };
  features: Record<string, boolean | string | number | null>;
  amenities: string[];
  images: Array<{
    url: string;
    isMain: boolean;
  }>;
  owner: {
    id: string;
    name: string;
    company?: string;
  };
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Elasticsearch mappings
export const PROPERTY_INDEX_MAPPINGS = {
  properties: {
    id: { type: 'keyword' },
    title: { 
      type: 'text',
      analyzer: 'custom_analyzer',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    description: { 
      type: 'text',
      analyzer: 'custom_analyzer'
    },
    price: { type: 'double' },
    currency: { type: 'keyword' },
    propertyType: { type: 'keyword' },
    listingType: { type: 'keyword' },
    status: { type: 'keyword' },
    bedrooms: { type: 'integer' },
    bathrooms: { type: 'integer' },
    floorArea: { type: 'double' },
    address: {
      properties: {
        street: { type: 'text', analyzer: 'custom_analyzer' },
        city: { 
          type: 'text',
          analyzer: 'custom_analyzer',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        postcode: { type: 'keyword' },
        county: { type: 'keyword' },
        country: { type: 'keyword' }
      }
    },
    location: { type: 'geo_point' },
    features: {
      properties: {
        garden: { type: 'boolean' },
        parking: { type: 'boolean' },
        garage: { type: 'boolean' },
        balcony: { type: 'boolean' },
        terrace: { type: 'boolean' },
        elevator: { type: 'boolean' },
        airConditioning: { type: 'boolean' },
        furnished: { type: 'boolean' },
        petFriendly: { type: 'boolean' },
        buildYear: { type: 'integer' },
        energyRating: { type: 'keyword' }
      }
    },
    amenities: { type: 'keyword' },
    images: {
      properties: {
        url: { type: 'keyword' },
        isMain: { type: 'boolean' }
      }
    },
    owner: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'text' },
        company: { type: 'text' }
      }
    },
    viewCount: { type: 'integer' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    publishedAt: { type: 'date' }
  }
};