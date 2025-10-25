import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Alert,
  Checkbox,
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
import { register, resetAuthError } from '@/store/auth/authSlice';

export const RegisterPage = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { error, isLoading } = useSelector((state: RootState) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  // Form validation schema
  const validationSchema = Yup.object({
    firstName: Yup.string()
      .required(t('validation.firstNameRequired'))
      .min(2, t('validation.firstNameLength')),
    lastName: Yup.string()
      .required(t('validation.lastNameRequired'))
      .min(2, t('validation.lastNameLength')),
    email: Yup.string()
      .email(t('validation.emailInvalid'))
      .required(t('validation.emailRequired')),
    password: Yup.string()
      .required(t('validation.passwordRequired'))
      .min(8, t('validation.passwordLength'))
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        t('validation.passwordComplexity')
      ),
    role: Yup.string()
      .required(t('validation.roleRequired')),
    agreeTerms: Yup.boolean()
      .oneOf([true], t('validation.termsRequired')),
  });

  // Form handling
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'BUYER',
      agreeTerms: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      const { agreeTerms, ...userData } = values;
      const resultAction = await dispatch(register(userData));
      if (register.fulfilled.match(resultAction)) {
        navigate('/dashboard');
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
            {t('register.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('register.subtitle')}
          </Typography>

          {/* Error alert */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 3 }} onClose={handleResetError}>
              {error}
            </Alert>
          )}

          {/* Registration form */}
          <Box component="form" onSubmit={formik.handleSubmit} noValidate sx={{ width: '100%' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="firstName"
                  label={t('form.firstName')}
                  name="firstName"
                  autoComplete="given-name"
                  autoFocus
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                  helperText={formik.touched.firstName && formik.errors.firstName}
                  disabled={isLoading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label={t('form.lastName')}
                  name="lastName"
                  autoComplete="family-name"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                  helperText={formik.touched.lastName && formik.errors.lastName}
                  disabled={isLoading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label={t('form.email')}
                  name="email"
                  autoComplete="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                  disabled={isLoading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label={t('form.password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
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
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={formik.touched.role && Boolean(formik.errors.role)}>
                  <InputLabel id="role-label">{t('form.role')}</InputLabel>
                  <Select
                    labelId="role-label"
                    id="role"
                    name="role"
                    value={formik.values.role}
                    label={t('form.role')}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isLoading}
                  >
                    <MenuItem value="BUYER">{t('common:roles.buyer')}</MenuItem>
                    <MenuItem value="SELLER">{t('common:roles.seller')}</MenuItem>
                    <MenuItem value="AGENT">{t('common:roles.agent')}</MenuItem>
                  </Select>
                  {formik.touched.role && formik.errors.role && (
                    <FormHelperText>{formik.errors.role}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="agreeTerms"
                      color="primary"
                      checked={formik.values.agreeTerms}
                      onChange={formik.handleChange}
                      disabled={isLoading}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {t('register.agreeTerms')}{' '}
                      <Link component={RouterLink} to="/terms">
                        {t('register.terms')}
                      </Link>{' '}
                      {t('register.and')}{' '}
                      <Link component={RouterLink} to="/privacy">
                        {t('register.privacy')}
                      </Link>
                    </Typography>
                  }
                />
                {formik.touched.agreeTerms && formik.errors.agreeTerms && (
                  <FormHelperText error>{formik.errors.agreeTerms}</FormHelperText>
                )}
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
            >
              {isLoading ? t('register.registering') : t('register.submit')}
            </Button>
          </Box>

          {/* Social registration */}
          <Box sx={{ width: '100%', mt: 2 }}>
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('register.orContinueWith')}
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

          {/* Login link */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2">
              {t('register.haveAccount')}{' '}
              <Link component={RouterLink} to="/login" variant="body2">
                {t('register.login')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};