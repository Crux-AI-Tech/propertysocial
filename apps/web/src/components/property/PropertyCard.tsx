import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  Avatar,
  IconButton,
  Typography,
  Skeleton,
  Chip,
  Fade,
  Paper,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  ShareOutlined,
  BookmarkBorder,
  Bookmark,
  MoreVert,
  CheckCircle,
  LocalParking,
  Deck,
  Elevator,
  Yard,
  Weekend,
  Pets,
} from '@mui/icons-material';

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    price: number;
    currency: string;
    propertyType: string;
    listingType: string;
    bedrooms?: number;
    bathrooms?: number;
    size?: number;
    energyRating?: string;
    location: {
      city: string;
      country: string;
    };
    images: string[];
    features?: Record<string, boolean>;
    agent?: {
      name?: string;
      avatar?: string;
    };
  };
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const PropertyCard = ({ property, isFavorite = false, onToggleFavorite }: PropertyCardProps) => {
  const { t } = useTranslation(['property', 'common']);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(isFavorite);
  const [localSaved, setLocalSaved] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalFavorite(!localFavorite);
    if (onToggleFavorite) {
      onToggleFavorite(property.id);
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalSaved(!localSaved);
  };

  // Format price based on currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get energy rating color based on rating
  const getEnergyRatingColor = (rating?: string) => {
    if (!rating) return '#808080';
    const ratingUpper = rating.toUpperCase();
    if (ratingUpper.includes('A')) return '#00A651'; // Green
    if (ratingUpper === 'B') return '#4FB848'; // Light green
    if (ratingUpper === 'C') return '#BED630'; // Yellow-green
    if (ratingUpper === 'D') return '#FFF200'; // Yellow
    if (ratingUpper === 'E') return '#FDB913'; // Orange
    if (ratingUpper === 'F') return '#F37021'; // Dark orange
    if (ratingUpper === 'G') return '#ED1C24'; // Red
    return '#808080'; // Gray for unknown
  };

  // Get feature icon
  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'parking': return <LocalParking fontSize="small" />;
      case 'balcony': return <Deck fontSize="small" />;
      case 'elevator': return <Elevator fontSize="small" />;
      case 'garden': return <Yard fontSize="small" />;
      case 'furnished': return <Weekend fontSize="small" />;
      case 'petFriendly': return <Pets fontSize="small" />;
      default: return <CheckCircle fontSize="small" />;
    }
  };

  // Get active features
  const activeFeatures = property.features 
    ? Object.entries(property.features)
        .filter(([_, value]) => value)
        .map(([key]) => key)
    : [];

  return (
    <Card 
      className="property-card"
      sx={{
        maxWidth: 600,
        mx: 'auto',
        mb: 3,
        bgcolor: 'background.paper',
      }}
    >
      {/* Header - Instagram style with avatar and location */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1.5,
        borderBottom: '1px solid #efefef'
      }}>
        <Avatar
          src={property.agent?.avatar || `https://i.pravatar.cc/150?u=${property.id}`}
          sx={{ width: 32, height: 32, mr: 1.5 }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
            {property.agent?.name || 'Property Agent'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {property.location.city}, {property.location.country}
          </Typography>
        </Box>
        <IconButton size="small">
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>

      {/* Property image - Full width, square aspect ratio like Instagram */}
      <Box 
        component={RouterLink} 
        to={`/properties/${property.id}`}
        onMouseEnter={() => activeFeatures.length > 0 && setShowFeatures(true)}
        onMouseLeave={() => setShowFeatures(false)}
        sx={{ 
          position: 'relative', 
          paddingTop: '100%', /* 1:1 aspect ratio */
          display: 'block',
          textDecoration: 'none',
        }}
      >
        {!imageLoaded && (
          <Skeleton 
            variant="rectangular" 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }} 
          />
        )}
        <Box
          component="img"
          src={property.images[0]}
          alt={property.title}
          onLoad={() => setImageLoaded(true)}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: imageLoaded ? 'block' : 'none',
          }}
        />

        {/* Energy Rating Badge - Top Right */}
        {property.energyRating && (
          <Chip
            label={property.energyRating}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: getEnergyRatingColor(property.energyRating),
              color: 'white',
              fontWeight: 700,
              fontSize: '0.875rem',
              px: 0.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          />
        )}

        {/* Property Features Overlay - Shows on hover */}
        {activeFeatures.length > 0 && (
          <Fade in={showFeatures}>
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 2,
                p: 2,
                minWidth: '200px',
                maxWidth: '80%',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                {t('property:card.features')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {activeFeatures.map((feature) => (
                  <Chip
                    key={feature}
                    icon={getFeatureIcon(feature)}
                    label={t(`property:features.${feature}`)}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Paper>
          </Fade>
        )}
      </Box>

      {/* Action buttons - Instagram style */}
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton 
            size="medium" 
            onClick={handleFavoriteClick}
            sx={{ p: 0.5, mr: 1 }}
          >
            {localFavorite ? (
              <Favorite sx={{ color: '#ed4956', fontSize: 28 }} />
            ) : (
              <FavoriteBorder sx={{ fontSize: 28 }} />
            )}
          </IconButton>
          <IconButton 
            component={RouterLink}
            to={`/properties/${property.id}`}
            size="medium"
            sx={{ p: 0.5, mr: 1 }}
          >
            <ChatBubbleOutline sx={{ fontSize: 28 }} />
          </IconButton>
          <IconButton size="medium" sx={{ p: 0.5 }}>
            <ShareOutlined sx={{ fontSize: 28 }} />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <IconButton 
            size="medium" 
            onClick={handleSaveClick}
            sx={{ p: 0.5 }}
          >
            {localSaved ? (
              <Bookmark sx={{ fontSize: 28 }} />
            ) : (
              <BookmarkBorder sx={{ fontSize: 28 }} />
            )}
          </IconButton>
        </Box>

        {/* Price and title */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, fontSize: '0.9375rem' }}>
          {formatPrice(property.price, property.currency)}
          {property.listingType === 'RENT' && (
            <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 0.5 }}>
              / {t('property:card.perMonth')}
            </Typography>
          )}
        </Typography>
        
        {/* Description */}
        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5, fontSize: '0.875rem' }}>
          <Typography component="span" sx={{ fontWeight: 600, mr: 0.5 }}>
            {property.title}
          </Typography>
        </Typography>

        {/* Property details */}
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          {[
            property.bedrooms && `${property.bedrooms} ${t('property:features.bedrooms')}`,
            property.bathrooms && `${property.bathrooms} ${t('property:features.bathrooms')}`,
            property.size && `${property.size}m²`,
          ].filter(Boolean).join(' • ')}
        </Typography>

        {/* Property type badge */}
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          >
            #{t(`property:types.${property.propertyType.toLowerCase()}`)}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: property.listingType === 'SALE' ? 'secondary.main' : 'success.main',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          >
            #{t(`property:listingTypes.${property.listingType.toLowerCase()}`)}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};