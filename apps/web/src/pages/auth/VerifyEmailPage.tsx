import { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Container,
  Link,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

import { authApi } from '@/services/api/authApi';

export const VerifyEmailPage = () => {
  const { t } = useTranslation('auth');
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from URL query params
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError(t('verifyEmail.missingToken'));
        setIsLoading(false);
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setIsVerified(true);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || t('verifyEmail.error'));
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, t]);

  // Redirect to login after successful verification
  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            {t('verifyEmail.title')}
          </Typography>

          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                {t('verifyEmail.verifying')}
              </Typography>
            </Box>
          ) : isVerified ? (
            <Box sx={{ textAlign: 'center', my: 2 }}>
              <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Alert severity="success" sx={{ mb: 3 }}>
                {t('verifyEmail.success')}
              </Alert>
              <Typography variant="body1" paragraph>
                {t('verifyEmail.successMessage')}
              </Typography>
              <Button
                variant="contained"
                onClick={handleLoginRedirect}
                sx={{ mt: 2 }}
              >
                {t('verifyEmail.login')}
              </Button>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', my: 2 }}>
              <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
              <Alert severity="error" sx={{ mb: 3 }}>
                {error || t('verifyEmail.genericError')}
              </Alert>
              <Typography variant="body1" paragraph>
                {t('verifyEmail.errorMessage')}
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  sx={{ mr: 2 }}
                >
                  {t('verifyEmail.login')}
                </Button>
                <Button
                  component={RouterLink}
                  to="/contact"
                  variant="outlined"
                >
                  {t('verifyEmail.contact')}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};