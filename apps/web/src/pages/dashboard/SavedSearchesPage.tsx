import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

export const SavedSearchesPage = () => {
  const { t } = useTranslation(['property', 'common']);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedSearches = async () => {
      try {
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSavedSearches([]);
      } catch (error) {
        setError(t('property:savedSearches.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedSearches();
  }, [t]);

  const handleDeleteSearch = async (searchId: string) => {
    try {
      // TODO: Replace with actual API call
      setSavedSearches(prev => prev.filter(search => search.id !== searchId));
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
  };

  const handleRunSearch = (search: any) => {
    // TODO: Navigate to search page with filters
    console.log('Running search:', search);
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
        {t('property:savedSearches.title')}
      </Typography>

      {savedSearches.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" gutterBottom>
            {t('property:savedSearches.empty')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('property:savedSearches.emptyDescription')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {savedSearches.map((search) => (
            <Grid item xs={12} sm={6} md={4} key={search.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {search.name}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    {search.filters.propertyType && (
                      <Chip
                        label={t(`property:types.${search.filters.propertyType.toLowerCase()}`)}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                    {search.filters.listingType && (
                      <Chip
                        label={t(`property:listingTypes.${search.filters.listingType.toLowerCase()}`)}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                    {search.filters.city && (
                      <Chip
                        label={search.filters.city}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    {t('property:savedSearches.createdAt', {
                      date: new Date(search.createdAt).toLocaleDateString(),
                    })}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<SearchIcon />}
                    onClick={() => handleRunSearch(search)}
                  >
                    {t('property:savedSearches.runSearch')}
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteSearch(search.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};