import { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
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
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

import { authApi } from '../../services/api/authApi';

export const ResetPasswordPage = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get token from URL query params
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  // Form validation schema
  const validationSchema = Yup.object({
    password: Yup.string()
      .required(t('validation.passwordRequired'))
      .min(8, t('validation.passwordLength'))
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        t('validation.passwordComplexity')
      ),
    confirmPassword: Yup.string()
      .required(t('validation.confirmPasswordRequired'))
      .oneOf([Yup.ref('password')], t('validation.passwordsMatch')),
  });

  // Form handling
  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!token) {
        setError(t('resetPassword.invalidToken'));
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        await authApi.resetPassword(token, values.password);
        setIsSubmitted(true);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || t('resetPassword.error'));
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Redirect to login after successful password reset
  const handleLoginRedirect = () => {
    navigate('/login');
  };

  // Show error if no token is provided
  if (!token && !error) {
    setError(t('resetPassword.missingToken'));
  }

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
            {t('resetPassword.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('resetPassword.subtitle')}
          </Typography>

          {/* Success message */}
          {isSubmitted ? (
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                {t('resetPassword.success')}
              </Alert>
              <Typography variant="body2" paragraph>
                {t('resetPassword.successMessage')}
              </Typography>
              <Button
                variant="contained"
                onClick={handleLoginRedirect}
                sx={{ mt: 2 }}
              >
                {t('resetPassword.backToLogin')}
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

              {/* Reset password form */}
              <Box component="form" onSubmit={formik.handleSubmit} noValidate sx={{ width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label={t('form.newPassword')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={formik.touched.password && formik.errors.password}
                  disabled={isLoading || !token}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label={t('form.confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                  helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                  disabled={isLoading || !token}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={handleToggleConfirmPasswordVisibility}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                  disabled={isLoading || !token}
                >
                  {isLoading ? t('resetPassword.resetting') : t('resetPassword.submit')}
                </Button>
              </Box>

              {/* Back to login link */}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2">
                  <Link component={RouterLink} to="/login" variant="body2">
                    {t('resetPassword.backToLogin')}
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