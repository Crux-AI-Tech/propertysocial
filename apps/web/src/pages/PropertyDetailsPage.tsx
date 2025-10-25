import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Share,
  BedOutlined,
  BathtubOutlined,
  SquareFootOutlined,
  LocationOn,
  CalendarToday,
  ArrowBack,
  Check,
  Close,
  Print,
  Home,
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`property-tabpanel-${index}`}
      aria-labelledby={`property-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const PropertyDetailsPage = () => {
  const { t } = useTranslation(['property', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [tabValue, setTabValue] = useState(0);

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

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Box sx={{ display: 'flex', mb: 2 }}>
        <Button
          component={RouterLink}
          to="/search"
          startIcon={<ArrowBack />}
          sx={{ mr: 2 }}
        >
          {t('property:details.backToSearch')}
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          <Home fontSize="small" sx={{ mr: 0.5 }} />
          {property.location.city}, {property.location.country}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Property images */}
        <Grid item xs={12} md={8}>
          <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
            <Box
              component="img"
              src={property.images[activeImage]}
              alt={property.title}
              sx={{
                width: '100%',
                height: { xs: 300, sm: 400, md: 500 },
                objectFit: 'cover',
                borderRadius: 2,
              }}
            />
            
            {/* Image navigation */}
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <IconButton
                  onClick={handlePrevImage}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                  }}
                >
                  <ChevronLeft />
                </IconButton>
                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  {activeImage + 1} / {property.images.length}
                </Typography>
                <IconButton
                  onClick={handleNextImage}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </Box>
            </Box>
          </Box>
          
          {/* Thumbnail gallery */}
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
            {property.images.map((image: string, index: number) => (
              <Box
                key={index}
                component="img"
                src={image}
                alt={`Thumbnail ${index + 1}`}
                onClick={() => setActiveImage(index)}
                sx={{
                  width: 80,
                  height: 60,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: index === activeImage ? `2px solid ${theme.palette.primary.main}` : 'none',
                  opacity: index === activeImage ? 1 : 0.7,
                  transition: 'all 0.2s',
                  '&:hover': {
                    opacity: 1,
                  },
                }}
              />
            ))}
          </Box>
        </Grid>

        {/* Property details */}
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              {/* Price and type */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h4" component="div" fontWeight="bold">
                  {formatPrice(property.price, property.currency)}
                  {property.listingType === 'RENT' && (
                    <Typography variant="body1" component="span" color="text.secondary">
                      {' '}{t('property:card.perMonth')}
                    </Typography>
                  )}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    label={t(`property:types.${property.propertyType.toLowerCase()}`)}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={t(`property:listingTypes.${property.listingType.toLowerCase()}`)}
                    color={property.listingType === 'SALE' ? 'secondary' : 'success'}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Key features */}
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                {property.bedrooms !== undefined && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <BedOutlined color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {property.bedrooms} {t('property:features.bedrooms')}
                    </Typography>
                  </Box>
                )}
                
                {property.bathrooms !== undefined && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <BathtubOutlined color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {property.bathrooms} {t('property:features.bathrooms')}
                    </Typography>
                  </Box>
                )}
                
                {property.size !== undefined && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <SquareFootOutlined color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {property.size} m²
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Location */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('property:details.location')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <LocationOn color="action" sx={{ mr: 1, mt: 0.3 }} />
                  <Typography variant="body2">
                    {property.location.address}<br />
                    {property.location.postcode} {property.location.city}<br />
                    {property.location.country}
                  </Typography>
                </Box>
              </Box>

              {/* Listed date */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('property:details.listedDate')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarToday color="action" sx={{ mr: 1, fontSize: 'small' }} />
                  <Typography variant="body2">
                    {formatDate(property.createdAt)}
                  </Typography>
                </Box>
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => window.open(`tel:${property.agent.phone}`)}
                >
                  {t('property:details.contact')}
                </Button>
                <IconButton
                  aria-label={isFavorite ? t('property:card.removeFromFavorites') : t('property:card.addToFavorites')}
                  onClick={handleToggleFavorite}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
                <IconButton
                  aria-label={t('property:details.share')}
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Share />
                </IconButton>
              </Box>
            </CardContent>
          </Card>

          {/* Agent card */}
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {t('property:details.listedBy')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src={property.agent.avatar}
                  alt={property.agent.name}
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    mr: 2,
                  }}
                />
                <Box>
                  <Typography variant="subtitle2">
                    {property.agent.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {property.agent.company}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 1 }}
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
            </CardContent>
          </Card>
        </Grid>

        {/* Tabs section */}
        <Grid item xs={12}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="property details tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={t('property:details.tabs.description')} id="property-tab-0" aria-controls="property-tabpanel-0" />
              <Tab label={t('property:details.tabs.features')} id="property-tab-1" aria-controls="property-tabpanel-1" />
              <Tab label={t('property:details.tabs.location')} id="property-tab-2" aria-controls="property-tabpanel-2" />
            </Tabs>
          </Box>

          {/* Description tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="body1" paragraph>
              {property.description.split('\n\n').map((paragraph: string, index: number) => (
                <Typography key={index} variant="body1" paragraph>
                  {paragraph}
                </Typography>
              ))}
            </Typography>
          </TabPanel>

          {/* Features tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  {t('property:details.propertyDetails')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          {t('property:details.propertyType')}
                        </TableCell>
                        <TableCell>
                          {t(`property:types.${property.propertyType.toLowerCase()}`)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          {t('property:details.bedrooms')}
                        </TableCell>
                        <TableCell>{property.bedrooms}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          {t('property:details.bathrooms')}
                        </TableCell>
                        <TableCell>{property.bathrooms}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          {t('property:details.size')}
                        </TableCell>
                        <TableCell>{property.size} m²</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          {t('property:details.yearBuilt')}
                        </TableCell>
                        <TableCell>{property.yearBuilt}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          {t('property:details.energyRating')}
                        </TableCell>
                        <TableCell>{property.energyRating}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          {t('property:details.heating')}
                        </TableCell>
                        <TableCell>{property.features.heating}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  {t('property:details.features')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableBody>
                      {Object.entries(property.features)
                        .filter(([key]) => typeof property.features[key] === 'boolean')
                        .map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell component="th" scope="row">
                              {t(`property:features.${key}`)}
                            </TableCell>
                            <TableCell>
                              {value ? (
                                <Check color="success" />
                              ) : (
                                <Close color="error" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                  {t('property:details.amenities')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {property.amenities.map((amenity: string) => (
                    <Chip
                      key={amenity}
                      label={amenity}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Location tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ height: 400, width: '100%', mb: 3 }}>
              <PropertyMap
                properties={[property]}
                center={[property.location.lat, property.location.lng]}
                zoom={15}
              />
            </Box>
            <Typography variant="body1" paragraph>
              {t('property:details.locationDescription', {
                city: property.location.city,
                country: property.location.country,
              })}
            </Typography>
          </TabPanel>
        </Grid>
      </Grid>
    </Container>
  );
};