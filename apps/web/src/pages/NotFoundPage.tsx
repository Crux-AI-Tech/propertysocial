import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
} from '@mui/material';
import {
  Home as HomeIcon,
} from '@mui/icons-material';

export const NotFoundPage = () => {
  const { t } = useTranslation(['common']);

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h1" component="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h4" component="h2" gutterBottom>
        {t('common:notFound.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {t('common:notFound.description')}
      </Typography>
      <Button
        component={RouterLink}
        to="/"
        variant="contained"
        startIcon={<HomeIcon />}
        sx={{ mt: 2 }}
      >
        {t('common:notFound.goHome')}
      </Button>
    </Container>
  );
};