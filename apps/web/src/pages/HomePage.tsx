import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';

import { PropertyCard } from '../components/property/PropertyCard';

// Mock data for properties - Instagram feed style
const energyRatings = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

const mockProperties = Array.from({ length: 12 }, (_, i) => ({
  id: `property-${i + 1}`,
  title: `${['Stunning', 'Beautiful', 'Modern', 'Luxury', 'Cozy'][i % 5]} ${i % 2 === 0 ? 'Apartment' : 'House'} in ${['Berlin', 'Paris', 'Madrid', 'Rome', 'Amsterdam'][i % 5]}`,
  description: 'Perfect property with excellent amenities and great location.',
  price: Math.floor(Math.random() * 500000) + 100000,
  currency: 'EUR',
  propertyType: i % 2 === 0 ? 'APARTMENT' : 'HOUSE',
  listingType: i % 3 === 0 ? 'RENT' : 'SALE',
  bedrooms: Math.floor(Math.random() * 5) + 1,
  bathrooms: Math.floor(Math.random() * 3) + 1,
  size: Math.floor(Math.random() * 200) + 50,
  location: {
    address: `${Math.floor(Math.random() * 100) + 1} Main Street`,
    city: ['Berlin', 'Paris', 'Madrid', 'Rome', 'Amsterdam'][i % 5],
    country: ['Germany', 'France', 'Spain', 'Italy', 'Netherlands'][i % 5],
  },
  images: [
    `https://picsum.photos/seed/${i + 1}/800/800`,
    `https://picsum.photos/seed/${i + 10}/800/800`,
    `https://picsum.photos/seed/${i + 20}/800/800`,
  ],
  features: {
    garden: i % 3 === 0,
    parking: i % 2 === 0,
    balcony: i % 4 === 0,
    elevator: i % 5 === 0,
    furnished: i % 2 === 1,
  },
  energyRating: energyRatings[i % energyRatings.length], // EU energy rating
  agent: {
    name: ['Sarah Johnson', 'Michael Brown', 'Emma Wilson', 'James Davis', 'Olivia Martinez'][i % 5],
    avatar: `https://i.pravatar.cc/150?img=${(i % 10) + 1}`,
  },
  createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
}));

export const HomePage = () => {
  const { t } = useTranslation(['common', 'property']);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('ALL'); // ALL, SALE, RENT

  useEffect(() => {
    // Simulate loading properties
    const loadProperties = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      setProperties(mockProperties);
      setIsLoading(false);
    };

    loadProperties();
  }, []);

  // Filter properties based on listing type
  const filteredProperties = listingTypeFilter === 'ALL' 
    ? properties 
    : properties.filter(p => p.listingType === listingTypeFilter);

  const saleCount = properties.filter(p => p.listingType === 'SALE').length;
  const rentCount = properties.filter(p => p.listingType === 'RENT').length;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 2 }}>
      <Container maxWidth="sm" disableGutters>
        {/* Feed Header */}
        <Box sx={{ px: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('common:propertyFeed')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('common:discoverProperties')}
          </Typography>
        </Box>

        {/* Listing Type Filter Tabs */}
        <Box sx={{ px: 2, mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={listingTypeFilter} 
            onChange={(_, newValue) => setListingTypeFilter(newValue)}
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
              },
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {t('property:filters.all')}
                  <Chip 
                    label={properties.length} 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              } 
              value="ALL" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {t('property:listingTypes.sale')}
                  <Chip 
                    label={saleCount} 
                    size="small" 
                    color="secondary"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              } 
              value="SALE" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {t('property:listingTypes.rent')}
                  <Chip 
                    label={rentCount} 
                    size="small" 
                    color="success"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              } 
              value="RENT" 
            />
          </Tabs>
        </Box>

        {/* Property Feed */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {filteredProperties.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  {t('property:noProperties')}
                </Typography>
              </Box>
            ) : (
              filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                />
              ))
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
};