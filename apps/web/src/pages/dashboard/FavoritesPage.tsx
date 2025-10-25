import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';

import { PropertyCard } from '@/components/property/PropertyCard';

export const FavoritesPage = () => {
  const { t } = useTranslation(['property', 'common']);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFavorites([]);
      } catch (error) {
        setError(t('property:favorites.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [t]);

  const handleToggleFavorite = (propertyId: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== propertyId));
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('property:favorites.title')}
      </Typography>

      {favorites.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" gutterBottom>
            {t('property:favorites.empty')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('property:favorites.emptyDescription')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {favorites.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <PropertyCard
                property={property}
                isFavorite={true}
                onToggleFavorite={handleToggleFavorite}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};