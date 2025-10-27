import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Share,
  LocationOn,
  ArrowBack,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';

import { PropertyMap } from '../components/property/PropertyMap';

// Mock property data
const mockProperty = {
  id: 'property-1',
  title: 'Beautiful Apartment in Berlin',
  description: 'This stunning apartment is located in the heart of Berlin, offering modern amenities and excellent connectivity. The property features a spacious living room, fully equipped kitchen, and a balcony with city views. The building has secure access, elevator, and is close to public transportation, shops, and restaurants.\n\nThe apartment has been recently renovated with high-quality materials and fixtures. The open-plan kitchen includes modern appliances and plenty of storage space. The bedroom is quiet and overlooks a peaceful courtyard. The bathroom features a walk-in shower and heated towel rails.\n\nThis property is perfect for professionals or couples looking for a central location with all the conveniences of city living.',
  price: 450000,
  currency: 'EUR',
  propertyType: 'APARTMENT',
  listingType: 'SALE',
  status: 'ACTIVE',
  bedrooms: 2,
  bathrooms: 1,
  size: 85,
  yearBuilt: 2010,
  energyRating: 'B',
  location: {
    address: '123 Berliner Straße',
    city: 'Berlin',
    postcode: '10115',
    county: 'Berlin',
    country: 'DE',
    lat: 52.5200,
    lng: 13.4050,
  },
  features: {
    garden: false,
    parking: true,
    balcony: true,
    terrace: false,
    elevator: true,
    furnished: true,
    petFriendly: false,
    airConditioning: true,
    heating: 'Central',
  },
  amenities: [
    'Elevator',
    'Security System',
    'Balcony',
    'Air Conditioning',
    'Central Heating',
    'Fully Furnished',
    'Storage Room',
    'Bike Storage',
  ],
  images: [
    'https://picsum.photos/seed/1/1200/800',
    'https://picsum.photos/seed/2/1200/800',
    'https://picsum.photos/seed/3/1200/800',
    'https://picsum.photos/seed/4/1200/800',
    'https://picsum.photos/seed/5/1200/800',
  ],
  createdAt: '2023-05-15T10:30:00Z',
  agent: {
    id: 'agent-1',
    name: 'John Smith',
    company: 'Berlin Real Estate',
    phone: '+49 123 456 7890',
    email: 'john.smith@example.com',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
};

export const PropertyDetailsPage = () => {
  const { t } = useTranslation(['property', 'common']);
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use mock data for now
        setProperty(mockProperty);
      } catch (err) {
        setError(t('property:details.error'));
        console.error('Error fetching property:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProperty();
  }, [id, t]);

  // Toggle favorite
  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  // Navigate through images
  const handlePrevImage = () => {
    setActiveImage((prev) => (prev > 0 ? prev - 1 : property.images.length - 1));
  };

  const handleNextImage = () => {
    setActiveImage((prev) => (prev < property.images.length - 1 ? prev + 1 : 0));
  };

  // Format price based on currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t('property:details.loading')}
        </Typography>
      </Container>
    );
  }

  if (error || !property) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || t('property:details.notFound')}
        </Alert>
        <Button
          component={RouterLink}
          to="/search"
          startIcon={<ArrowBack />}
          variant="contained"
        >
          {t('property:details.backToSearch')}
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="sm" disableGutters>
        {/* Instagram-style Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <IconButton
            component={RouterLink}
            to="/search"
            sx={{ mr: 1 }}
          >
            <ArrowBack />
          </IconButton>
          <Box
            component="img"
            src={property.agent.avatar}
            alt={property.agent.name}
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              mr: 1.5,
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {property.agent.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {property.location.city}, {property.location.country}
            </Typography>
          </Box>
        </Box>

        {/* Full-width image carousel */}
        <Box sx={{ position: 'relative', bgcolor: 'black' }}>
          <Box
            component="img"
            src={property.images[activeImage]}
            alt={property.title}
            sx={{
              width: '100%',
              height: { xs: 400, sm: 500, md: 600 },
              objectFit: 'contain',
              bgcolor: 'black',
            }}
          />
          
          {/* Image dots indicator */}
          {property.images.length > 1 && (
            <Box 
              sx={{ 
                position: 'absolute',
                bottom: 16,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: 0.5,
              }}
            >
              {property.images.map((_: string, index: number) => (
                <Box
                  key={index}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: index === activeImage ? 'white' : 'rgba(255, 255, 255, 0.5)',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </Box>
          )}
          
          {/* Prev/Next buttons */}
          {property.images.length > 1 && (
            <>
              <IconButton
                onClick={handlePrevImage}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.95)' },
                }}
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                onClick={handleNextImage}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.95)' },
                }}
              >
                <ChevronRight />
              </IconButton>
            </>
          )}
        </Box>

        {/* Instagram-style action buttons */}
        <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <IconButton 
              size="medium" 
              onClick={handleToggleFavorite}
              sx={{ p: 0.5, mr: 1 }}
            >
              {isFavorite ? (
                <Favorite sx={{ color: '#ed4956', fontSize: 28 }} />
              ) : (
                <FavoriteBorder sx={{ fontSize: 28 }} />
              )}
            </IconButton>
            <IconButton size="medium" sx={{ p: 0.5, mr: 1 }}>
              <Share sx={{ fontSize: 28 }} />
            </IconButton>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              onClick={() => window.open(`tel:${property.agent.phone}`)}
              sx={{ borderRadius: 8, px: 3 }}
            >
              {t('property:details.contact')}
            </Button>
          </Box>

          {/* Price and title */}
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {formatPrice(property.price, property.currency)}
            {property.listingType === 'RENT' && (
              <Typography variant="body1" component="span" color="text.secondary" sx={{ ml: 0.5 }}>
                / {t('property:card.perMonth')}
              </Typography>
            )}
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
            {property.title}
          </Typography>

          {/* Property details in compact format */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {[
              property.bedrooms && `${property.bedrooms} ${t('property:details.bedrooms')}`,
              property.bathrooms && `${property.bathrooms} ${t('property:details.bathrooms')}`,
              property.size && `${property.size}m²`,
              property.yearBuilt && `Built ${property.yearBuilt}`,
            ].filter(Boolean).join(' • ')}
          </Typography>

          {/* Property type badges as hashtags */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
              #{t(`property:types.${property.propertyType.toLowerCase()}`).replace(' ', '')}
            </Typography>
            <Typography variant="body2" sx={{ color: property.listingType === 'SALE' ? 'secondary.main' : 'success.main', fontWeight: 600 }}>
              #{t(`property:listingTypes.${property.listingType.toLowerCase()}`)}
            </Typography>
            {property.energyRating && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                #Energy{property.energyRating}
              </Typography>
            )}
          </Box>

          {/* Description */}
          <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
            {property.description}
          </Typography>

          {/* Posted date */}
          <Typography variant="caption" color="text.secondary">
            {t('property:details.listedDate')}: {formatDate(property.createdAt)}
          </Typography>
        </Box>

        {/* Features Section */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {t('property:details.features')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {property.amenities.map((amenity: string) => (
              <Chip
                key={amenity}
                label={amenity}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>

        {/* Location Section */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {t('property:details.location')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <LocationOn color="action" sx={{ mr: 1, mt: 0.3 }} />
            <Box>
              <Typography variant="body2">
                {property.location.address}<br />
                {property.location.postcode} {property.location.city}<br />
                {property.location.country}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ height: 300, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
            <PropertyMap
              properties={[property]}
              center={[property.location.lat, property.location.lng]}
              zoom={15}
            />
          </Box>
        </Box>

        {/* Agent Card */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {t('property:details.listedBy')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              component="img"
              src={property.agent.avatar}
              alt={property.agent.name}
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                mr: 2,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {property.agent.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {property.agent.company}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => window.open(`mailto:${property.agent.email}`)}
            >
              {t('property:details.email')}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => window.open(`tel:${property.agent.phone}`)}
            >
              {t('property:details.call')}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};