import { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Facebook as FacebookIcon,
} from '@mui/icons-material';

import { RootState, AppDispatch } from '@/store';
import { login, resetAuthError } from '@/store/auth/authSlice';

export const LoginPage = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { error, isLoading } = useSelector((state: RootState) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  // Get redirect path from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Form validation schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('validation.emailInvalid'))
      .required(t('validation.emailRequired')),
    password: Yup.string()
      .required(t('validation.passwordRequired')),
  });

  // Form handling
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      const resultAction = await dispatch(login(values));
      if (login.fulfilled.match(resultAction)) {
        navigate(from, { replace: true });
      }
    },
  });

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Reset error when unmounting
  const handleResetError = () => {
    if (error) {
      dispatch(resetAuthError());
    }
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
            {t('login.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('login.subtitle')}
          </Typography>

          {/* Error alert */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 3 }} onClose={handleResetError}>
              {error}
            </Alert>
          )}

          {/* Login form */}
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
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('form.password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              disabled={isLoading}
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
            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <Link component={RouterLink} to="/forgot-password" variant="body2">
                {t('login.forgotPassword')}
              </Link>
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
            >
              {isLoading ? t('login.loggingIn') : t('login.submit')}
            </Button>
          </Box>

          {/* Social login */}
          <Box sx={{ width: '100%', mt: 2 }}>
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('login.orContinueWith')}
              </Typography>
            </Divider>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  sx={{ py: 1 }}
                  disabled={isLoading}
                >
                  Google
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FacebookIcon />}
                  sx={{ py: 1 }}
                  disabled={isLoading}
                >
                  Facebook
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Register link */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2">
              {t('login.noAccount')}{' '}
              <Link component={RouterLink} to="/register" variant="body2">
                {t('login.register')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};