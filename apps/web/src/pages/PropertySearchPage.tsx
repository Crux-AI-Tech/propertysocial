import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Typography,
  Pagination,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  Map as MapIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';

import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyMap } from '@/components/property/PropertyMap';
import { PropertySearchFilters } from '@/components/property/PropertySearchFilters';

// Mock data for properties
const mockProperties = Array.from({ length: 20 }, (_, i) => ({
  id: `property-${i + 1}`,
  title: `Beautiful ${i % 2 === 0 ? 'Apartment' : 'House'} in ${['Berlin', 'Paris', 'Madrid', 'Rome', 'Amsterdam'][i % 5]}`,
  description: 'Modern property with excellent amenities and great location.',
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
    country: ['DE', 'FR', 'ES', 'IT', 'NL'][i % 5],
    lat: 48.8566 + (Math.random() - 0.5) * 2,
    lng: 2.3522 + (Math.random() - 0.5) * 2,
  },
  images: [
    `https://picsum.photos/seed/${i + 1}/800/600`,
    `https://picsum.photos/seed/${i + 10}/800/600`,
    `https://picsum.photos/seed/${i + 20}/800/600`,
  ],
  features: {
    garden: i % 3 === 0,
    parking: i % 2 === 0,
    balcony: i % 4 === 0,
    elevator: i % 5 === 0,
    furnished: i % 2 === 1,
  },
  createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
  agent: {
    id: `agent-${i % 5 + 1}`,
    name: `Agent ${i % 5 + 1}`,
    phone: '+1234567890',
    email: `agent${i % 5 + 1}@example.com`,
  },
}));

export const PropertySearchPage = () => {
  const { t } = useTranslation(['property', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [totalProperties, setTotalProperties] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);

  // Search filters
  const [filters, setFilters] = useState({
    query: searchParams.get('query') || '',
    propertyType: searchParams.get('propertyType') || '',
    listingType: searchParams.get('listingType') || '',
    minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : 0,
    maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : 2000000,
    minBedrooms: searchParams.get('minBedrooms') ? parseInt(searchParams.get('minBedrooms')!) : 0,
    maxBedrooms: searchParams.get('maxBedrooms') ? parseInt(searchParams.get('maxBedrooms')!) : 5,
    minBathrooms: searchParams.get('minBathrooms') ? parseInt(searchParams.get('minBathrooms')!) : 0,
    country: searchParams.get('country') || '',
    city: searchParams.get('city') || '',
    features: {
      garden: searchParams.get('garden') === 'true',
      parking: searchParams.get('parking') === 'true',
      balcony: searchParams.get('balcony') === 'true',
      elevator: searchParams.get('elevator') === 'true',
      furnished: searchParams.get('furnished') === 'true',
    },
  });

  // Load properties based on filters
  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Filter properties based on search criteria
        let filteredProperties = [...mockProperties];
        
        if (filters.query) {
          const query = filters.query.toLowerCase();
          filteredProperties = filteredProperties.filter(
            p => p.title.toLowerCase().includes(query) || 
                 p.description.toLowerCase().includes(query) ||
                 p.location.city.toLowerCase().includes(query) ||
                 p.location.country.toLowerCase().includes(query)
          );
        }
        
        if (filters.propertyType) {
          filteredProperties = filteredProperties.filter(p => p.propertyType === filters.propertyType);
        }
        
        if (filters.listingType) {
          filteredProperties = filteredProperties.filter(p => p.listingType === filters.listingType);
        }
        
        if (filters.minPrice > 0) {
          filteredProperties = filteredProperties.filter(p => p.price >= filters.minPrice);
        }
        
        if (filters.maxPrice < 2000000) {
          filteredProperties = filteredProperties.filter(p => p.price <= filters.maxPrice);
        }
        
        if (filters.minBedrooms > 0) {
          filteredProperties = filteredProperties.filter(p => p.bedrooms >= filters.minBedrooms);
        }
        
        if (filters.country) {
          filteredProperties = filteredProperties.filter(p => p.location.country === filters.country);
        }
        
        if (filters.city) {
          filteredProperties = filteredProperties.filter(p => p.location.city === filters.city);
        }
        
        // Filter by features
        Object.entries(filters.features).forEach(([feature, value]) => {
          if (value) {
            filteredProperties = filteredProperties.filter(p => p.features[feature]);
          }
        });
        
        setTotalProperties(filteredProperties.length);
        
        // Paginate results
        const itemsPerPage = 9;
        const startIndex = (page - 1) * itemsPerPage;
        const paginatedProperties = filteredProperties.slice(startIndex, startIndex + itemsPerPage);
        
        setProperties(paginatedProperties);
      } catch (err) {
        setError(t('property:search.error'));
        console.error('Error fetching properties:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProperties();
  }, [filters, page, t]);

  // Update URL search params when filters change
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    
    if (filters.query) newSearchParams.set('query', filters.query);
    if (filters.propertyType) newSearchParams.set('propertyType', filters.propertyType);
    if (filters.listingType) newSearchParams.set('listingType', filters.listingType);
    if (filters.minPrice > 0) newSearchParams.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice < 2000000) newSearchParams.set('maxPrice', filters.maxPrice.toString());
    if (filters.minBedrooms > 0) newSearchParams.set('minBedrooms', filters.minBedrooms.toString());
    if (filters.country) newSearchParams.set('country', filters.country);
    if (filters.city) newSearchParams.set('city', filters.city);
    
    // Add features to URL
    Object.entries(filters.features).forEach(([feature, value]) => {
      if (value) newSearchParams.set(feature, 'true');
    });
    
    setSearchParams(newSearchParams);
  }, [filters, setSearchParams]);

  // Handle filter changes
  const handleFilterChange = (name: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
    setPage(1); // Reset to first page when filters change
  };

  // Handle feature filter changes
  const handleFeatureChange = (feature: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: checked,
      },
    }));
    setPage(1); // Reset to first page when filters change
  };

  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(prev => (prev === 'list' ? 'map' : 'list'));
  };

  // Toggle filters panel on mobile
  const toggleFilters = () => {
    setFiltersOpen(prev => !prev);
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      query: '',
      propertyType: '',
      listingType: '',
      minPrice: 0,
      maxPrice: 2000000,
      minBedrooms: 0,
      maxBedrooms: 5,
      minBathrooms: 0,
      country: '',
      city: '',
      features: {
        garden: false,
        parking: false,
        balcony: false,
        elevator: false,
        furnished: false,
      },
    });
    setPage(1);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('property:search.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('property:search.subtitle')}
        </Typography>
      </Box>

      {/* Search bar */}
      <Card sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder={t('property:search.searchPlaceholder')}
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: filters.query ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="clear search"
                      onClick={() => handleFilterChange('query', '')}
                      edge="end"
                    >
                      <CloseIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel id="property-type-label">{t('property:search.propertyType')}</InputLabel>
              <Select
                labelId="property-type-label"
                id="property-type"
                value={filters.propertyType}
                label={t('property:search.propertyType')}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
              >
                <MenuItem value="">{t('common:all')}</MenuItem>
                <MenuItem value="APARTMENT">{t('property:types.apartment')}</MenuItem>
                <MenuItem value="HOUSE">{t('property:types.house')}</MenuItem>
                <MenuItem value="COMMERCIAL">{t('property:types.commercial')}</MenuItem>
                <MenuItem value="LAND">{t('property:types.land')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel id="listing-type-label">{t('property:search.listingType')}</InputLabel>
              <Select
                labelId="listing-type-label"
                id="listing-type"
                value={filters.listingType}
                label={t('property:search.listingType')}
                onChange={(e) => handleFilterChange('listingType', e.target.value)}
              >
                <MenuItem value="">{t('common:all')}</MenuItem>
                <MenuItem value="SALE">{t('property:listingTypes.sale')}</MenuItem>
                <MenuItem value="RENT">{t('property:listingTypes.rent')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<FilterListIcon />}
                onClick={toggleFilters}
                sx={{ display: { md: 'none' } }}
              >
                {t('property:search.filters')}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={viewMode === 'list' ? <MapIcon /> : <ViewListIcon />}
                onClick={toggleViewMode}
              >
                {viewMode === 'list' ? t('property:search.mapView') : t('property:search.listView')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Grid container spacing={4}>
        {/* Filters panel */}
        {filtersOpen && (
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('property:search.filters')}</Typography>
                <Box>
                  <Button size="small" onClick={resetFilters}>
                    {t('property:search.resetFilters')}
                  </Button>
                  {isMobile && (
                    <IconButton onClick={toggleFilters}>
                      <CloseIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <PropertySearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onFeatureChange={handleFeatureChange}
              />
            </Card>
          </Grid>
        )}

        {/* Property listings */}
        <Grid item xs={12} md={filtersOpen ? 9 : 12}>
          {/* Results summary */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              {isLoading ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : (
                <>
                  {totalProperties} {t('property:search.resultsFound')}
                </>
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {Object.entries(filters.features).map(([feature, value]) => (
                value && (
                  <Chip
                    key={feature}
                    label={t(`property:features.${feature}`)}
                    onDelete={() => handleFeatureChange(feature, false)}
                    size="small"
                  />
                )
              ))}
              {filters.propertyType && (
                <Chip
                  label={t(`property:types.${filters.propertyType.toLowerCase()}`)}
                  onDelete={() => handleFilterChange('propertyType', '')}
                  size="small"
                />
              )}
              {filters.listingType && (
                <Chip
                  label={t(`property:listingTypes.${filters.listingType.toLowerCase()}`)}
                  onDelete={() => handleFilterChange('listingType', '')}
                  size="small"
                />
              )}
            </Box>
          </Box>

          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Property list view */}
          {viewMode === 'list' ? (
            <>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
                  <CircularProgress />
                </Box>
              ) : properties.length > 0 ? (
                <Grid container spacing={3}>
                  {properties.map((property) => (
                    <Grid item xs={12} sm={6} md={filtersOpen ? 6 : 4} key={property.id}>
                      <PropertyCard property={property} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" gutterBottom>
                    {t('property:search.noResults')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('property:search.tryDifferentFilters')}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={resetFilters}
                    sx={{ mt: 2 }}
                  >
                    {t('property:search.resetFilters')}
                  </Button>
                </Box>
              )}

              {/* Pagination */}
              {totalProperties > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={Math.ceil(totalProperties / 9)}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          ) : (
            /* Map view */
            <Box sx={{ height: 600, width: '100%', mb: 4 }}>
              <PropertyMap properties={properties} />
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};