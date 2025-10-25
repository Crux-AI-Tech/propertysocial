import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Search as SearchIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

export const HomePage = () => {
  const { t } = useTranslation(['common', 'property']);

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          {t('common:welcome')}
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          {t('common:subtitle')}
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button
            component={RouterLink}
            to="/search"
            variant="contained"
            size="large"
            startIcon={<SearchIcon />}
            sx={{ mr: 2 }}
          >
            {t('property:search.title')}
          </Button>
          <Button
            component={RouterLink}
            to="/properties/create"
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
          >
            {t('property:create.title')}
          </Button>
        </Box>
      </Box>

      {/* Features */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <SearchIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                {t('property:search.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('property:search.description')}
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={RouterLink} to="/search" size="small">
                {t('common:learnMore')}
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <AddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                {t('property:create.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('property:create.description')}
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={RouterLink} to="/properties/create" size="small">
                {t('common:learnMore')}
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                {t('property:analytics.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('property:analytics.description')}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">
                {t('common:learnMore')}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};