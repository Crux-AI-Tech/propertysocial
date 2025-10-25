import { prisma } from '@eu-real-estate/database';
import { PropertyType, ListingType, PropertyStatus } from '@eu-real-estate/database';
import { elasticsearchClient } from './elasticsearch';
import { logger } from './utils/logger';
import {
  PropertySearchQuery,
  PropertySearchResult,
  PropertySearchHit,
  PropertyIndexDocument,
  PROPERTY_INDEX_MAPPINGS,
  PropertyAnalytics,
  MarketTrends,
  PropertyRecommendation,
} from './types';

export class PropertySearchService {
  private static readonly INDEX_NAME = 'properties';

  /**
   * Initialize Elasticsearch index for properties
   */
  public static async initialize(): Promise<void> {
    try {
      await elasticsearchClient.connect();
      await elasticsearchClient.createIndex(this.INDEX_NAME, PROPERTY_INDEX_MAPPINGS);
      logger.info('Property search index initialized');
    } catch (error) {
      logger.error('Failed to initialize property search index:', error);
      throw error;
    }
  }

  /**
   * Index a property in Elasticsearch
   */
  public static async indexProperty(propertyId: string): Promise<void> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  company: true,
                },
              },
            },
          },
        },
      });

      if (!property) {
        logger.warn(`Property not found for indexing: ${propertyId}`);
        return;
      }

      const document: PropertyIndexDocument = {
        id: property.id,
        title: property.title,
        description: property.description,
        price: parseFloat(property.price.toString()),
        currency: property.currency,
        propertyType: property.propertyType,
        listingType: property.listingType,
        status: property.status,
        bedrooms: property.features?.bedrooms || undefined,
        bathrooms: property.features?.bathrooms || undefined,
        floorArea: property.features?.floorArea ? parseFloat(property.features.floorArea.toString()) : undefined,
        address: {
          street: property.address?.street || '',
          city: property.address?.city || '',
          postcode: property.address?.postcode || '',
          county: property.address?.county || undefined,
          country: property.address?.country || '',
        },
        location: property.location ? {
          lat: parseFloat(property.location.latitude.toString()),
          lon: parseFloat(property.location.longitude.toString()),
        } : undefined,
        features: {
          garden: property.features?.garden || false,
          parking: property.features?.parking || false,
          garage: property.features?.garage || false,
          balcony: property.features?.balcony || false,
          terrace: property.features?.terrace || false,
          elevator: property.features?.elevator || false,
          airConditioning: property.features?.airConditioning || false,
          furnished: property.features?.furnished || false,
          petFriendly: property.features?.petFriendly || false,
          buildYear: property.features?.buildYear || null,
          energyRating: property.features?.energyRating || null,
        },
        amenities: property.amenities.map(a => a.name),
        images: property.images.map(img => ({
          url: img.url,
          isMain: img.isMain,
        })),
        owner: {
          id: property.owner.id,
          name: `${property.owner.firstName} ${property.owner.lastName}`,
          company: property.owner.profile?.company,
        },
        viewCount: property.viewCount,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt.toISOString(),
        publishedAt: property.publishedAt?.toISOString(),
      };

      await elasticsearchClient.indexDocument(this.INDEX_NAME, propertyId, document);
      logger.info(`Indexed property: ${propertyId}`);
    } catch (error) {
      logger.error(`Failed to index property ${propertyId}:`, error);
      throw error;
    }
  }

  /**
   * Update a property in Elasticsearch
   */
  public static async updateProperty(propertyId: string): Promise<void> {
    await this.indexProperty(propertyId);
  }

  /**
   * Delete a property from Elasticsearch
   */
  public static async deleteProperty(propertyId: string): Promise<void> {
    try {
      await elasticsearchClient.deleteDocument(this.INDEX_NAME, propertyId);
      logger.info(`Deleted property from index: ${propertyId}`);
    } catch (error) {
      logger.error(`Failed to delete property ${propertyId} from index:`, error);
      throw error;
    }
  }

  /**
   * Reindex all properties
   */
  public static async reindexAll(): Promise<void> {
    try {
      // Delete and recreate index
      await elasticsearchClient.deleteIndex(this.INDEX_NAME);
      await elasticsearchClient.createIndex(this.INDEX_NAME, PROPERTY_INDEX_MAPPINGS);

      // Get all active properties
      const properties = await prisma.property.findMany({
        where: {
          isActive: true,
          status: {
            in: [PropertyStatus.ACTIVE, PropertyStatus.PENDING],
          },
        },
        include: {
          address: true,
          location: true,
          features: true,
          amenities: true,
          images: {
            orderBy: { order: 'asc' },
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  company: true,
                },
              },
            },
          },
        },
      });

      // Prepare documents for bulk indexing
      const documents = properties.map(property => {
        const document: PropertyIndexDocument = {
          id: property.id,
          title: property.title,
          description: property.description,
          price: parseFloat(property.price.toString()),
          currency: property.currency,
          propertyType: property.propertyType,
          listingType: property.listingType,
          status: property.status,
          bedrooms: property.features?.bedrooms || undefined,
          bathrooms: property.features?.bathrooms || undefined,
          floorArea: property.features?.floorArea ? parseFloat(property.features.floorArea.toString()) : undefined,
          address: {
            street: property.address?.street || '',
            city: property.address?.city || '',
            postcode: property.address?.postcode || '',
            county: property.address?.county || undefined,
            country: property.address?.country || '',
          },
          location: property.location ? {
            lat: parseFloat(property.location.latitude.toString()),
            lon: parseFloat(property.location.longitude.toString()),
          } : undefined,
          features: {
            garden: property.features?.garden || false,
            parking: property.features?.parking || false,
            garage: property.features?.garage || false,
            balcony: property.features?.balcony || false,
            terrace: property.features?.terrace || false,
            elevator: property.features?.elevator || false,
            airConditioning: property.features?.airConditioning || false,
            furnished: property.features?.furnished || false,
            petFriendly: property.features?.petFriendly || false,
            buildYear: property.features?.buildYear || null,
            energyRating: property.features?.energyRating || null,
          },
          amenities: property.amenities.map(a => a.name),
          images: property.images.map(img => ({
            url: img.url,
            isMain: img.isMain,
          })),
          owner: {
            id: property.owner.id,
            name: `${property.owner.firstName} ${property.owner.lastName}`,
            company: property.owner.profile?.company,
          },
          viewCount: property.viewCount,
          createdAt: property.createdAt.toISOString(),
          updatedAt: property.updatedAt.toISOString(),
          publishedAt: property.publishedAt?.toISOString(),
        };

        return { id: property.id, document };
      });

      // Bulk index in batches of 100
      const batchSize = 100;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await elasticsearchClient.bulkIndex(this.INDEX_NAME, batch);
        logger.info(`Indexed batch ${i / batchSize + 1} of ${Math.ceil(documents.length / batchSize)}`);
      }

      logger.info(`Reindexed ${documents.length} properties`);
    } catch (error) {
      logger.error('Failed to reindex properties:', error);
      throw error;
    }
  }

  /**
   * Search properties
   */
  public static async searchProperties(query: PropertySearchQuery): Promise<PropertySearchResult> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const from = (page - 1) * limit;

      // Build Elasticsearch query
      const esQuery: any = {
        from,
        size: limit,
        query: {
          bool: {
            must: [
              { term: { status: 'ACTIVE' } },
            ],
            filter: [],
          },
        },
        sort: [],
        aggs: {
          propertyTypes: {
            terms: { field: 'propertyType' },
          },
          listingTypes: {
            terms: { field: 'listingType' },
          },
          priceRanges: {
            range: {
              field: 'price',
              ranges: [
                { to: 100000 },
                { from: 100000, to: 200000 },
                { from: 200000, to: 500000 },
                { from: 500000, to: 1000000 },
                { from: 1000000 },
              ],
            },
          },
          cities: {
            terms: { field: 'address.city.keyword', size: 20 },
          },
          countries: {
            terms: { field: 'address.country', size: 20 },
          },
          features: {
            nested: {
              path: 'features',
            },
            aggs: {
              garden: {
                filter: { term: { 'features.garden': true } },
              },
              parking: {
                filter: { term: { 'features.parking': true } },
              },
              furnished: {
                filter: { term: { 'features.furnished': true } },
              },
              petFriendly: {
                filter: { term: { 'features.petFriendly': true } },
              },
            },
          },
          amenities: {
            terms: { field: 'amenities', size: 20 },
          },
        },
      };

      // Add text search if provided
      if (query.query) {
        esQuery.query.bool.must.push({
          multi_match: {
            query: query.query,
            fields: ['title^3', 'description^2', 'address.street', 'address.city^2', 'address.country'],
            fuzziness: 'AUTO',
          },
        });
      }

      // Add property type filter
      if (query.propertyType && query.propertyType.length > 0) {
        esQuery.query.bool.filter.push({
          terms: { propertyType: query.propertyType },
        });
      }

      // Add listing type filter
      if (query.listingType) {
        esQuery.query.bool.filter.push({
          term: { listingType: query.listingType },
        });
      }

      // Add price range filter
      if (query.priceMin || query.priceMax) {
        const priceRange: any = {};
        if (query.priceMin) priceRange.gte = query.priceMin;
        if (query.priceMax) priceRange.lte = query.priceMax;
        
        esQuery.query.bool.filter.push({
          range: { price: priceRange },
        });
      }

      // Add bedroom filter
      if (query.bedroomsMin || query.bedroomsMax) {
        const bedroomsRange: any = {};
        if (query.bedroomsMin) bedroomsRange.gte = query.bedroomsMin;
        if (query.bedroomsMax) bedroomsRange.lte = query.bedroomsMax;
        
        esQuery.query.bool.filter.push({
          range: { bedrooms: bedroomsRange },
        });
      }

      // Add bathroom filter
      if (query.bathroomsMin || query.bathroomsMax) {
        const bathroomsRange: any = {};
        if (query.bathroomsMin) bathroomsRange.gte = query.bathroomsMin;
        if (query.bathroomsMax) bathroomsRange.lte = query.bathroomsMax;
        
        esQuery.query.bool.filter.push({
          range: { bathrooms: bathroomsRange },
        });
      }

      // Add floor area filter
      if (query.floorAreaMin || query.floorAreaMax) {
        const floorAreaRange: any = {};
        if (query.floorAreaMin) floorAreaRange.gte = query.floorAreaMin;
        if (query.floorAreaMax) floorAreaRange.lte = query.floorAreaMax;
        
        esQuery.query.bool.filter.push({
          range: { floorArea: floorAreaRange },
        });
      }

      // Add location filter
      if (query.country) {
        esQuery.query.bool.filter.push({
          term: { 'address.country': query.country },
        });
      }

      if (query.city) {
        esQuery.query.bool.filter.push({
          match: { 'address.city': query.city },
        });
      }

      // Add geo distance filter if location provided
      if (query.location && query.radius) {
        esQuery.query.bool.filter.push({
          geo_distance: {
            distance: `${query.radius}km`,
            location: {
              lat: query.location.lat,
              lon: query.location.lon,
            },
          },
        });
      }

      // Add feature filters
      if (query.features) {
        Object.entries(query.features).forEach(([feature, value]) => {
          if (value !== undefined) {
            esQuery.query.bool.filter.push({
              term: { [`features.${feature}`]: value },
            });
          }
        });
      }

      // Add amenities filter
      if (query.amenities && query.amenities.length > 0) {
        esQuery.query.bool.filter.push({
          terms: { amenities: query.amenities },
        });
      }

      // Add sorting
      if (query.sortBy) {
        const sortOrder = query.sortOrder || 'desc';
        
        if (query.sortBy === '_score') {
          esQuery.sort.push({ _score: sortOrder });
        } else {
          esQuery.sort.push({ [query.sortBy]: sortOrder });
        }
      } else {
        // Default sort by date
        esQuery.sort.push({ updatedAt: 'desc' });
      }

      // Execute search
      const response = await elasticsearchClient.search(this.INDEX_NAME, esQuery);
      
      // Parse results
      const total = response.hits.total.value;
      const totalPages = Math.ceil(total / limit);
      
      const properties: PropertySearchHit[] = response.hits.hits.map((hit: any) => {
        const source = hit._source;
        
        return {
          id: source.id,
          title: source.title,
          description: source.description,
          price: source.price,
          currency: source.currency,
          propertyType: source.propertyType as PropertyType,
          listingType: source.listingType as ListingType,
          bedrooms: source.bedrooms,
          bathrooms: source.bathrooms,
          floorArea: source.floorArea,
          address: source.address,
          location: source.location,
          features: source.features,
          amenities: source.amenities,
          images: source.images,
          owner: source.owner,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
          score: hit._score,
        };
      });

      // Parse aggregations
      const aggregations = response.aggregations ? {
        propertyTypes: this.parseTermsAggregation(response.aggregations.propertyTypes),
        listingTypes: this.parseTermsAggregation(response.aggregations.listingTypes),
        priceRanges: response.aggregations.priceRanges.buckets,
        cities: response.aggregations.cities.buckets,
        countries: response.aggregations.countries.buckets,
        features: {
          garden: response.aggregations.features.garden.doc_count,
          parking: response.aggregations.features.parking.doc_count,
          furnished: response.aggregations.features.furnished.doc_count,
          petFriendly: response.aggregations.features.petFriendly.doc_count,
        },
        amenities: response.aggregations.amenities.buckets,
      } : undefined;

      return {
        properties,
        total,
        page,
        limit,
        totalPages,
        aggregations,
      };
    } catch (error) {
      logger.error('Property search failed:', error);
      throw error;
    }
  }

  /**
   * Get property analytics for a specific location
   */
  public static async getPropertyAnalytics(
    country: string,
    city?: string,
    propertyType?: PropertyType,
    listingType?: ListingType
  ): Promise<PropertyAnalytics> {
    try {
      // Build Elasticsearch query
      const esQuery: any = {
        size: 0,
        query: {
          bool: {
            must: [
              { term: { status: 'ACTIVE' } },
              { term: { 'address.country': country } },
            ],
            filter: [],
          },
        },
        aggs: {
          averagePrice: { avg: { field: 'price' } },
          medianPrice: { percentiles: { field: 'price', percents: [50] } },
          pricePerSquareMeter: {
            avg: {
              script: {
                source: 'doc[\'price\'].value / (doc[\'floorArea\'].value > 0 ? doc[\'floorArea\'].value : 1)',
              },
            },
          },
          listingCount: { value_count: { field: 'id' } },
          priceDistribution: {
            range: {
              field: 'price',
              ranges: [
                { to: 100000 },
                { from: 100000, to: 200000 },
                { from: 200000, to: 300000 },
                { from: 300000, to: 500000 },
                { from: 500000, to: 750000 },
                { from: 750000, to: 1000000 },
                { from: 1000000, to: 2000000 },
                { from: 2000000 },
              ],
            },
          },
          popularFeatures: {
            filters: {
              filters: {
                garden: { term: { 'features.garden': true } },
                parking: { term: { 'features.parking': true } },
                garage: { term: { 'features.garage': true } },
                balcony: { term: { 'features.balcony': true } },
                terrace: { term: { 'features.terrace': true } },
                elevator: { term: { 'features.elevator': true } },
                airConditioning: { term: { 'features.airConditioning': true } },
                furnished: { term: { 'features.furnished': true } },
                petFriendly: { term: { 'features.petFriendly': true } },
              },
            },
          },
          daysOnMarket: {
            avg: {
              script: {
                source: 'if (doc[\'publishedAt\'].size() > 0) { return (System.currentTimeMillis() - doc[\'publishedAt\'].value.toInstant().toEpochMilli()) / (1000 * 60 * 60 * 24); } else { return 0; }',
              },
            },
          },
        },
      };

      // Add city filter if provided
      if (city) {
        esQuery.query.bool.must.push({
          match: { 'address.city': city },
        });
      }

      // Add property type filter if provided
      if (propertyType) {
        esQuery.query.bool.filter.push({
          term: { propertyType },
        });
      }

      // Add listing type filter if provided
      if (listingType) {
        esQuery.query.bool.filter.push({
          term: { listingType },
        });
      }

      // Execute query
      const response = await elasticsearchClient.search(this.INDEX_NAME, esQuery);
      
      // Parse results
      const aggs = response.aggregations;
      const listingCount = aggs.listingCount.value;
      
      // Calculate popular features
      const popularFeatures = Object.entries(aggs.popularFeatures.buckets).map(([feature, bucket]: [string, any]) => ({
        feature,
        count: bucket.doc_count,
        percentage: (bucket.doc_count / listingCount) * 100,
      })).sort((a, b) => b.count - a.count);

      return {
        averagePrice: aggs.averagePrice.value,
        medianPrice: aggs.medianPrice.values['50.0'],
        pricePerSquareMeter: aggs.pricePerSquareMeter.value,
        listingCount,
        averageDaysOnMarket: aggs.daysOnMarket.value,
        priceDistribution: {
          min: aggs.priceDistribution.buckets[0].from || 0,
          max: aggs.priceDistribution.buckets[aggs.priceDistribution.buckets.length - 1].to || 0,
          ranges: aggs.priceDistribution.buckets,
        },
        popularFeatures,
      };
    } catch (error) {
      logger.error('Failed to get property analytics:', error);
      throw error;
    }
  }

  /**
   * Get market trends over time
   */
  public static async getMarketTrends(
    country: string,
    city?: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    propertyType?: PropertyType,
    listingType?: ListingType
  ): Promise<MarketTrends> {
    try {
      // Determine date interval based on period
      let interval: string;
      let dateFormat: string;
      let dateRange: string;
      
      switch (period) {
        case 'week':
          interval = 'day';
          dateFormat = 'yyyy-MM-dd';
          dateRange = 'now-7d/d';
          break;
        case 'month':
          interval = 'day';
          dateFormat = 'yyyy-MM-dd';
          dateRange = 'now-30d/d';
          break;
        case 'quarter':
          interval = 'week';
          dateFormat = 'yyyy-MM-dd';
          dateRange = 'now-90d/d';
          break;
        case 'year':
          interval = 'month';
          dateFormat = 'yyyy-MM';
          dateRange = 'now-1y/M';
          break;
      }

      // Build Elasticsearch query
      const esQuery: any = {
        size: 0,
        query: {
          bool: {
            must: [
              { term: { status: 'ACTIVE' } },
              { term: { 'address.country': country } },
              { range: { publishedAt: { gte: dateRange } } },
            ],
            filter: [],
          },
        },
        aggs: {
          trends: {
            date_histogram: {
              field: 'publishedAt',
              calendar_interval: interval,
              format: dateFormat,
              min_doc_count: 0,
              extended_bounds: {
                min: dateRange,
                max: 'now',
              },
            },
            aggs: {
              averagePrice: { avg: { field: 'price' } },
              listingCount: { value_count: { field: 'id' } },
            },
          },
          previousPeriodAvg: {
            avg: { field: 'price' },
          },
        },
      };

      // Add city filter if provided
      if (city) {
        esQuery.query.bool.must.push({
          match: { 'address.city': city },
        });
      }

      // Add property type filter if provided
      if (propertyType) {
        esQuery.query.bool.filter.push({
          term: { propertyType },
        });
      }

      // Add listing type filter if provided
      if (listingType) {
        esQuery.query.bool.filter.push({
          term: { listingType },
        });
      }

      // Execute query
      const response = await elasticsearchClient.search(this.INDEX_NAME, esQuery);
      
      // Parse results
      const trendBuckets = response.aggregations.trends.buckets;
      const previousAvg = response.aggregations.previousPeriodAvg.value || 0;
      
      // Calculate current average
      const currentAvg = trendBuckets.length > 0 ? 
        trendBuckets[trendBuckets.length - 1].averagePrice.value || 0 : 0;
      
      // Calculate change percentage
      const changePercentage = previousAvg > 0 ? 
        ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

      // Format trend data
      const data = trendBuckets.map((bucket: any) => ({
        date: bucket.key_as_string,
        averagePrice: bucket.averagePrice.value || 0,
        listingCount: bucket.listingCount.value,
      }));

      return {
        period,
        data,
        changePercentage,
      };
    } catch (error) {
      logger.error('Failed to get market trends:', error);
      throw error;
    }
  }

  /**
   * Get property recommendations for a user
   */
  public static async getPropertyRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<PropertyRecommendation[]> {
    try {
      // Get user preferences and search history
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          preferences: true,
          favorites: {
            include: {
              property: {
                include: {
                  address: true,
                  features: true,
                },
              },
            },
          },
          searches: {
            orderBy: { updatedAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Extract user preferences
      const preferences = user.preferences;
      const favoriteProperties = user.favorites.map(f => f.property);
      const recentSearches = user.searches;

      // Build recommendation query based on user behavior
      const esQuery: any = {
        size: limit,
        query: {
          bool: {
            must: [
              { term: { status: 'ACTIVE' } },
            ],
            should: [],
            must_not: [
              // Exclude properties the user already favorited
              {
                terms: {
                  id: favoriteProperties.map(p => p.id),
                },
              },
            ],
            filter: [],
          },
        },
      };

      // Add preference-based filters
      if (preferences) {
        // Add preferred property types
        if (preferences.preferredPropertyTypes && preferences.preferredPropertyTypes.length > 0) {
          esQuery.query.bool.should.push({
            terms: {
              propertyType: preferences.preferredPropertyTypes,
              boost: 2.0,
            },
          });
        }

        // Add price range
        if (preferences.priceRangeMin || preferences.priceRangeMax) {
          const priceRange: any = {};
          if (preferences.priceRangeMin) priceRange.gte = preferences.priceRangeMin;
          if (preferences.priceRangeMax) priceRange.lte = preferences.priceRangeMax;
          
          esQuery.query.bool.filter.push({
            range: { price: priceRange },
          });
        }
      }

      // Add favorite-based recommendations
      if (favoriteProperties.length > 0) {
        // Extract common features from favorites
        const favoriteFeatures = this.extractCommonFeatures(favoriteProperties);
        
        // Add feature-based boosts
        Object.entries(favoriteFeatures).forEach(([feature, value]) => {
          if (typeof value === 'boolean') {
            esQuery.query.bool.should.push({
              term: {
                [`features.${feature}`]: {
                  value,
                  boost: 1.5,
                },
              },
            });
          }
        });

        // Add location-based boosts
        const favoriteLocations = favoriteProperties
          .filter(p => p.address)
          .map(p => p.address!.city)
          .filter((city, index, self) => self.indexOf(city) === index);
        
        if (favoriteLocations.length > 0) {
          esQuery.query.bool.should.push({
            terms: {
              'address.city.keyword': favoriteLocations,
              boost: 2.0,
            },
          });
        }
      }

      // Add search-based recommendations
      if (recentSearches.length > 0) {
        // Extract search criteria
        const searchCriteria = recentSearches.map(s => s.criteria as any);
        
        // Add property type boosts from searches
        const searchPropertyTypes = searchCriteria
          .filter(c => c.propertyType && c.propertyType.length > 0)
          .flatMap(c => c.propertyType)
          .filter((type, index, self) => self.indexOf(type) === index);
        
        if (searchPropertyTypes.length > 0) {
          esQuery.query.bool.should.push({
            terms: {
              propertyType: searchPropertyTypes,
              boost: 1.8,
            },
          });
        }

        // Add listing type boosts from searches
        const searchListingTypes = searchCriteria
          .filter(c => c.listingType)
          .map(c => c.listingType)
          .filter((type, index, self) => self.indexOf(type) === index);
        
        if (searchListingTypes.length > 0) {
          esQuery.query.bool.should.push({
            terms: {
              listingType: searchListingTypes,
              boost: 1.8,
            },
          });
        }

        // Add location boosts from searches
        const searchCities = searchCriteria
          .filter(c => c.city)
          .map(c => c.city)
          .filter((city, index, self) => self.indexOf(city) === index);
        
        if (searchCities.length > 0) {
          esQuery.query.bool.should.push({
            terms: {
              'address.city.keyword': searchCities,
              boost: 2.0,
            },
          });
        }
      }

      // Execute search
      const response = await elasticsearchClient.search(this.INDEX_NAME, esQuery);
      
      // Parse results
      return response.hits.hits.map((hit: any) => {
        const source = hit._source;
        const mainImage = source.images.find((img: any) => img.isMain) || source.images[0];
        
        // Determine match reason
        let matchReason = 'Based on your preferences';
        
        if (hit._explanation) {
          const explanation = hit._explanation;
          
          if (explanation.details.some((d: any) => d.description.includes('city'))) {
            matchReason = `Popular in ${source.address.city}`;
          } else if (explanation.details.some((d: any) => d.description.includes('propertyType'))) {
            matchReason = `Similar ${source.propertyType.toLowerCase()} properties`;
          } else if (explanation.details.some((d: any) => d.description.includes('features'))) {
            matchReason = 'Matches your preferred features';
          }
        }
        
        return {
          id: source.id,
          title: source.title,
          price: source.price,
          currency: source.currency,
          propertyType: source.propertyType as PropertyType,
          listingType: source.listingType as ListingType,
          image: mainImage?.url,
          address: {
            city: source.address.city,
            country: source.address.country,
          },
          score: hit._score,
          matchReason,
        };
      });
    } catch (error) {
      logger.error('Failed to get property recommendations:', error);
      throw error;
    }
  }

  /**
   * Extract common features from a list of properties
   */
  private static extractCommonFeatures(properties: any[]): Record<string, boolean> {
    const features: Record<string, number> = {};
    const featureCount = properties.length;
    
    // Count feature occurrences
    properties.forEach(property => {
      if (property.features) {
        Object.entries(property.features).forEach(([key, value]) => {
          if (typeof value === 'boolean' && value === true) {
            features[key] = (features[key] || 0) + 1;
          }
        });
      }
    });
    
    // Keep features that appear in at least 50% of properties
    const commonFeatures: Record<string, boolean> = {};
    Object.entries(features).forEach(([key, count]) => {
      if (count / featureCount >= 0.5) {
        commonFeatures[key] = true;
      }
    });
    
    return commonFeatures;
  }

  /**
   * Parse terms aggregation
   */
  private static parseTermsAggregation(agg: any): Record<string, number> {
    const result: Record<string, number> = {};
    
    if (agg && agg.buckets) {
      agg.buckets.forEach((bucket: any) => {
        result[bucket.key] = bucket.doc_count;
      });
    }
    
    return result;
  }
}