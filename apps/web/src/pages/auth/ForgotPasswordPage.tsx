import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Container,
  Link,
  Paper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';

import { authApi } from '@/services/api/authApi';

export const ForgotPasswordPage = () => {
  const { t } = useTranslation('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form validation schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('validation.emailInvalid'))
      .required(t('validation.emailRequired')),
  });

  // Form handling
  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);
      
      try {
        await authApi.requestPasswordReset(values.email);
        setIsSubmitted(true);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || t('forgotPassword.error'));
      } finally {
        setIsLoading(false);
      }
    },
  });

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
            {t('forgotPassword.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('forgotPassword.subtitle')}
          </Typography>

          {/* Success message */}
          {isSubmitted ? (
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                {t('forgotPassword.success')}
              </Alert>
              <Typography variant="body2" paragraph>
                {t('forgotPassword.checkEmail')}
              </Typography>
              <Typography variant="body2">
                {t('forgotPassword.noEmail')}{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setIsSubmitted(false)}
                >
                  {t('forgotPassword.tryAgain')}
                </Link>
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                sx={{ mt: 3 }}
              >
                {t('forgotPassword.backToLogin')}
              </Button>
            </Box>
          ) : (
            <>
              {/* Error alert */}
              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 3 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {/* Forgot password form */}
              <Box component="form" onSubmit={formik.handleSubmit} noValidate sx={{ width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label={t('form.email')}
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                  disabled={isLoading}
                >
                  {isLoading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
                </Button>
              </Box>

              {/* Back to login link */}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2">
                  <Link component={RouterLink} to="/login" variant="body2">
                    {t('forgotPassword.backToLogin')}
                  </Link>
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};