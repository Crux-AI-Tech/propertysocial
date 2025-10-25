import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Favorite as FavoriteIcon,
  BookmarkBorder as BookmarkIcon,
} from '@mui/icons-material';

export const DashboardPage = () => {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('dashboard:title')}
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AddIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('dashboard:createProperty')}
              </Typography>
              <Button
                component={RouterLink}
                to="/properties/create"
                variant="contained"
                fullWidth
              >
                {t('common:create')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('dashboard:searchProperties')}
              </Typography>
              <Button
                component={RouterLink}
                to="/search"
                variant="contained"
                fullWidth
              >
                {t('common:search')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <FavoriteIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('dashboard:favorites')}
              </Typography>
              <Button
                component={RouterLink}
                to="/dashboard/favorites"
                variant="contained"
                fullWidth
              >
                {t('common:view')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <BookmarkIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('dashboard:savedSearches')}
              </Typography>
              <Button
                component={RouterLink}
                to="/dashboard/saved-searches"
                variant="contained"
                fullWidth
              >
                {t('common:view')}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};