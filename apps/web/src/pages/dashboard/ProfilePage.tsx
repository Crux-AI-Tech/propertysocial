import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Person,
  Security,
  Settings,
  PhotoCamera,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

import { RootState } from '@/store';
import { SUPPORTED_LANGUAGES } from '@/i18n';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const ProfilePage = () => {
  const { t } = useTranslation(['profile', 'common']);
  const { user } = useSelector((state: RootState) => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Profile form validation schema
  const profileValidationSchema = Yup.object({
    firstName: Yup.string().required(t('validation.firstNameRequired')),
    lastName: Yup.string().required(t('validation.lastNameRequired')),
    email: Yup.string().email(t('validation.emailInvalid')).required(t('validation.emailRequired')),
    phone: Yup.string().nullable(),
    bio: Yup.string().max(500, t('validation.bioLength')),
    company: Yup.string(),
    website: Yup.string().url(t('validation.websiteInvalid')),
  });

  // Password form validation schema
  const passwordValidationSchema = Yup.object({
    currentPassword: Yup.string().required(t('validation.currentPasswordRequired')),
    newPassword: Yup.string()
      .required(t('validation.newPasswordRequired'))
      .min(8, t('validation.passwordLength'))
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        t('validation.passwordComplexity')
      ),
    confirmPassword: Yup.string()
      .required(t('validation.confirmPasswordRequired'))
      .oneOf([Yup.ref('newPassword')], t('validation.passwordsMatch')),
  });

  // Preferences form validation schema
  const preferencesValidationSchema = Yup.object({
    language: Yup.string().required(t('validation.languageRequired')),
    currency: Yup.string().required(t('validation.currencyRequired')),
    emailNotifications: Yup.boolean(),
    smsNotifications: Yup.boolean(),
    pushNotifications: Yup.boolean(),
  });

  // Profile form
  const profileFormik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.profile?.bio || '',
      company: user?.profile?.company || '',
      website: user?.profile?.website || '',
    },
    validationSchema: profileValidationSchema,
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
  });

  // Password form
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: passwordValidationSchema,
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPasswordSuccess(true);
      passwordFormik.resetForm();
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
  });

  // Preferences form
  const preferencesFormik = useFormik({
    initialValues: {
      language: user?.preferences?.language || 'en',
      currency: user?.preferences?.currency || 'EUR',
      emailNotifications: user?.preferences?.emailNotifications || true,
      smsNotifications: user?.preferences?.smsNotifications || false,
      pushNotifications: user?.preferences?.pushNotifications || true,
    },
    validationSchema: preferencesValidationSchema,
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPreferencesSuccess(true);
      setTimeout(() => setPreferencesSuccess(false), 3000);
    },
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('profile:title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {t('profile:subtitle')}
      </Typography>

      <Grid container spacing={4}>
        {/* Profile sidebar */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={user?.avatar}
                  alt={user?.firstName}
                  sx={{ width: 120, height: 120, mb: 2 }}
                >
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </Avatar>
                <IconButton
                  color="primary"
                  aria-label="upload picture"
                  component="label"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'background.paper' },
                  }}
                >
                  <input hidden accept="image/*" type="file" />
                  <PhotoCamera />
                </IconButton>
              </Box>
              <Typography variant="h6" gutterBottom>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user?.email}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  py: 0.5,
                  px: 1.5,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 1,
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  mt: 1,
                }}
              >
                {t(`common:roles.${user?.role.toLowerCase()}`)}
              </Typography>
              
              <Divider sx={{ width: '100%', my: 2 }} />
              
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('profile:accountInfo')}
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      {t('profile:memberSince')}
                    </Typography>
                    <Typography variant="body2">Jan 1, 2023</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      {t('profile:status')}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      {t('profile:active')}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile tabs */}
        <Grid item xs={12} md={8}>
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="profile tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab icon={<Person />} label={t('profile:tabs.personal')} id="profile-tab-0" aria-controls="profile-tabpanel-0" />
                <Tab icon={<Security />} label={t('profile:tabs.security')} id="profile-tab-1" aria-controls="profile-tabpanel-1" />
                <Tab icon={<Settings />} label={t('profile:tabs.preferences')} id="profile-tab-2" aria-controls="profile-tabpanel-2" />
              </Tabs>
            </Box>

            {/* Personal Information Tab */}
            <TabPanel value={tabValue} index={0}>
              {profileSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {t('profile:personalInfoSuccess')}
                </Alert>
              )}
              <form onSubmit={profileFormik.handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="firstName"
                      name="firstName"
                      label={t('profile:form.firstName')}
                      value={profileFormik.values.firstName}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={profileFormik.touched.firstName && Boolean(profileFormik.errors.firstName)}
                      helperText={profileFormik.touched.firstName && profileFormik.errors.firstName}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="lastName"
                      name="lastName"
                      label={t('profile:form.lastName')}
                      value={profileFormik.values.lastName}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={profileFormik.touched.lastName && Boolean(profileFormik.errors.lastName)}
                      helperText={profileFormik.touched.lastName && profileFormik.errors.lastName}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="email"
                      name="email"
                      label={t('profile:form.email')}
                      value={profileFormik.values.email}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={profileFormik.touched.email && Boolean(profileFormik.errors.email)}
                      helperText={profileFormik.touched.email && profileFormik.errors.email}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="phone"
                      name="phone"
                      label={t('profile:form.phone')}
                      value={profileFormik.values.phone}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={profileFormik.touched.phone && Boolean(profileFormik.errors.phone)}
                      helperText={profileFormik.touched.phone && profileFormik.errors.phone}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="bio"
                      name="bio"
                      label={t('profile:form.bio')}
                      multiline
                      rows={4}
                      value={profileFormik.values.bio}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={profileFormik.touched.bio && Boolean(profileFormik.errors.bio)}
                      helperText={profileFormik.touched.bio && profileFormik.errors.bio}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="company"
                      name="company"
                      label={t('profile:form.company')}
                      value={profileFormik.values.company}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={profileFormik.touched.company && Boolean(profileFormik.errors.company)}
                      helperText={profileFormik.touched.company && profileFormik.errors.company}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="website"
                      name="website"
                      label={t('profile:form.website')}
                      value={profileFormik.values.website}
                      onChange={profileFormik.handleChange}
                      onBlur={profileFormik.handleBlur}
                      error={profileFormik.touched.website && Boolean(profileFormik.errors.website)}
                      helperText={profileFormik.touched.website && profileFormik.errors.website}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={profileFormik.isSubmitting}
                    >
                      {profileFormik.isSubmitting ? t('profile:saving') : t('profile:saveChanges')}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </TabPanel>

            {/* Security Tab */}
            <TabPanel value={tabValue} index={1}>
              {passwordSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {t('profile:passwordSuccess')}
                </Alert>
              )}
              <form onSubmit={passwordFormik.handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="currentPassword"
                      name="currentPassword"
                      label={t('profile:form.currentPassword')}
                      type={showPassword ? 'text' : 'password'}
                      value={passwordFormik.values.currentPassword}
                      onChange={passwordFormik.handleChange}
                      onBlur={passwordFormik.handleBlur}
                      error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
                      helperText={passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => setShowPassword(!showPassword)}
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
                    <TextField
                      fullWidth
                      id="newPassword"
                      name="newPassword"
                      label={t('profile:form.newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordFormik.values.newPassword}
                      onChange={passwordFormik.handleChange}
                      onBlur={passwordFormik.handleBlur}
                      error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
                      helperText={passwordFormik.touched.newPassword && passwordFormik.errors.newPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle new password visibility"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge="end"
                            >
                              {showNewPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="confirmPassword"
                      name="confirmPassword"
                      label={t('profile:form.confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordFormik.values.confirmPassword}
                      onChange={passwordFormik.handleChange}
                      onBlur={passwordFormik.handleBlur}
                      error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
                      helperText={passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle confirm password visibility"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={passwordFormik.isSubmitting}
                    >
                      {passwordFormik.isSubmitting ? t('profile:changing') : t('profile:changePassword')}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </TabPanel>

            {/* Preferences Tab */}
            <TabPanel value={tabValue} index={2}>
              {preferencesSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  {t('profile:preferencesSuccess')}
                </Alert>
              )}
              <form onSubmit={preferencesFormik.handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={preferencesFormik.touched.language && Boolean(preferencesFormik.errors.language)}>
                      <InputLabel id="language-label">{t('profile:form.language')}</InputLabel>
                      <Select
                        labelId="language-label"
                        id="language"
                        name="language"
                        value={preferencesFormik.values.language}
                        label={t('profile:form.language')}
                        onChange={preferencesFormik.handleChange}
                        onBlur={preferencesFormik.handleBlur}
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <MenuItem key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {preferencesFormik.touched.language && preferencesFormik.errors.language && (
                        <FormHelperText>{preferencesFormik.errors.language}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={preferencesFormik.touched.currency && Boolean(preferencesFormik.errors.currency)}>
                      <InputLabel id="currency-label">{t('profile:form.currency')}</InputLabel>
                      <Select
                        labelId="currency-label"
                        id="currency"
                        name="currency"
                        value={preferencesFormik.values.currency}
                        label={t('profile:form.currency')}
                        onChange={preferencesFormik.handleChange}
                        onBlur={preferencesFormik.handleBlur}
                      >
                        <MenuItem value="EUR">EUR (€)</MenuItem>
                        <MenuItem value="GBP">GBP (£)</MenuItem>
                        <MenuItem value="USD">USD ($)</MenuItem>
                        <MenuItem value="PLN">PLN (zł)</MenuItem>
                        <MenuItem value="CZK">CZK (Kč)</MenuItem>
                      </Select>
                      {preferencesFormik.touched.currency && preferencesFormik.errors.currency && (
                        <FormHelperText>{preferencesFormik.errors.currency}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      {t('profile:notificationSettings')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel id="email-notifications-label">{t('profile:form.emailNotifications')}</InputLabel>
                      <Select
                        labelId="email-notifications-label"
                        id="emailNotifications"
                        name="emailNotifications"
                        value={preferencesFormik.values.emailNotifications}
                        label={t('profile:form.emailNotifications')}
                        onChange={preferencesFormik.handleChange}
                      >
                        <MenuItem value={true}>{t('common:yes')}</MenuItem>
                        <MenuItem value={false}>{t('common:no')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel id="sms-notifications-label">{t('profile:form.smsNotifications')}</InputLabel>
                      <Select
                        labelId="sms-notifications-label"
                        id="smsNotifications"
                        name="smsNotifications"
                        value={preferencesFormik.values.smsNotifications}
                        label={t('profile:form.smsNotifications')}
                        onChange={preferencesFormik.handleChange}
                      >
                        <MenuItem value={true}>{t('common:yes')}</MenuItem>
                        <MenuItem value={false}>{t('common:no')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel id="push-notifications-label">{t('profile:form.pushNotifications')}</InputLabel>
                      <Select
                        labelId="push-notifications-label"
                        id="pushNotifications"
                        name="pushNotifications"
                        value={preferencesFormik.values.pushNotifications}
                        label={t('profile:form.pushNotifications')}
                        onChange={preferencesFormik.handleChange}
                      >
                        <MenuItem value={true}>{t('common:yes')}</MenuItem>
                        <MenuItem value={false}>{t('common:no')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={preferencesFormik.isSubmitting}
                    >
                      {preferencesFormik.isSubmitting ? t('profile:saving') : t('profile:savePreferences')}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </TabPanel>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};