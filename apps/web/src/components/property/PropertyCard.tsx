import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Typography,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  BedOutlined,
  BathtubOutlined,
  SquareFootOutlined,
  LocationOn,
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
    location: {
      city: string;
      country: string;
    };
    images: string[];
    features?: Record<string, boolean>;
  };
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const PropertyCard = ({ property, isFavorite = false, onToggleFavorite }: PropertyCardProps) => {
  const { t } = useTranslation(['property', 'common']);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(isFavorite);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalFavorite(!localFavorite);
    if (onToggleFavorite) {
      onToggleFavorite(property.id);
    }
  };

  // Format price based on currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card 
      elevation={2} 
      className="property-card"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      <CardActionArea 
        component={RouterLink} 
        to={`/properties/${property.id}`}
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
        }}
      >
        {/* Property image */}
        <Box sx={{ position: 'relative', paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
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
          <CardMedia
            component="img"
            image={property.images[0]}
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
          
          {/* Property type and listing type badges */}
          <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 1 }}>
            <Chip
              label={t(`property:types.${property.propertyType.toLowerCase()}`)}
              size="small"
              color="primary"
              sx={{ 
                bgcolor: 'rgba(25, 118, 210, 0.8)',
                fontWeight: 'bold',
              }}
            />
            <Chip
              label={t(`property:listingTypes.${property.listingType.toLowerCase()}`)}
              size="small"
              color={property.listingType === 'SALE' ? 'secondary' : 'success'}
              sx={{ 
                bgcolor: property.listingType === 'SALE' 
                  ? 'rgba(245, 0, 87, 0.8)' 
                  : 'rgba(76, 175, 80, 0.8)',
                fontWeight: 'bold',
              }}
            />
          </Box>
          
          {/* Favorite button */}
          <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
            <IconButton
              aria-label={localFavorite ? t('property:card.removeFromFavorites') : t('property:card.addToFavorites')}
              onClick={handleFavoriteClick}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              {localFavorite ? (
                <Favorite color="error" />
              ) : (
                <FavoriteBorder />
              )}
            </IconButton>
          </Box>
        </Box>
        
        {/* Property details */}
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          {/* Price */}
          <Typography variant="h5" component="div" gutterBottom fontWeight="bold">
            {formatPrice(property.price, property.currency)}
            {property.listingType === 'RENT' && (
              <Typography variant="body2" component="span" color="text.secondary">
                {' '}{t('property:card.perMonth')}
              </Typography>
            )}
          </Typography>
          
          {/* Title */}
          <Typography 
            variant="h6" 
            component="h2" 
            gutterBottom
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.2,
              height: '2.4em',
            }}
          >
            {property.title}
          </Typography>
          
          {/* Location */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <LocationOn fontSize="small" color="action" sx={{ mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {property.location.city}, {property.location.country}
            </Typography>
          </Box>
          
          {/* Features */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            {property.bedrooms !== undefined && (
              <Tooltip title={t('property:features.bedrooms')}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BedOutlined fontSize="small" color="action" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">{property.bedrooms}</Typography>
                </Box>
              </Tooltip>
            )}
            
            {property.bathrooms !== undefined && (
              <Tooltip title={t('property:features.bathrooms')}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BathtubOutlined fontSize="small" color="action" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">{property.bathrooms}</Typography>
                </Box>
              </Tooltip>
            )}
            
            {property.size !== undefined && (
              <Tooltip title={t('property:features.size')}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SquareFootOutlined fontSize="small" color="action" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">{property.size} m²</Typography>
                </Box>
              </Tooltip>
            )}
          </Box>
          
          {/* Features tags */}
          {property.features && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 2 }}>
              {Object.entries(property.features)
                .filter(([_, value]) => value)
                .slice(0, 3)
                .map(([key]) => (
                  <Chip
                    key={key}
                    label={t(`property:features.${key}`)}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                ))}
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};