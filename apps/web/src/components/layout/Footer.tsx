import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Grid,
  Link,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Facebook, Twitter, Instagram, LinkedIn } from '@mui/icons-material';

import { Logo } from '../ui/Logo';

export const Footer = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        py: 6,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Logo and description */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-start' } }}>
              <RouterLink to="/">
                <Logo height={50} />
              </RouterLink>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: { xs: 'center', md: 'left' } }}>
                {t('common:footer.description')}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Link href="#" color="inherit" aria-label="Facebook">
                  <Facebook />
                </Link>
                <Link href="#" color="inherit" aria-label="Twitter">
                  <Twitter />
                </Link>
                <Link href="#" color="inherit" aria-label="Instagram">
                  <Instagram />
                </Link>
                <Link href="#" color="inherit" aria-label="LinkedIn">
                  <LinkedIn />
                </Link>
              </Box>
            </Box>
          </Grid>

          {/* Quick links */}
          <Grid item xs={6} md={2}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('common:footer.quickLinks')}
            </Typography>
            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/" color="inherit">
                  {t('common:nav.home')}
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/search" color="inherit">
                  {t('common:nav.search')}
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/dashboard" color="inherit">
                  {t('common:nav.dashboard')}
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/contact" color="inherit">
                  {t('common:nav.contact')}
                </Link>
              </Box>
            </Box>
          </Grid>

          {/* Legal */}
          <Grid item xs={6} md={2}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('common:footer.legal')}
            </Typography>
            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/terms" color="inherit">
                  {t('common:footer.terms')}
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/privacy" color="inherit">
                  {t('common:footer.privacy')}
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/cookies" color="inherit">
                  {t('common:footer.cookies')}
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/gdpr" color="inherit">
                  {t('common:footer.gdpr')}
                </Link>
              </Box>
            </Box>
          </Grid>

          {/* Contact */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('common:footer.contact')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {t('common:footer.address')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {t('common:footer.email')}: <Link href="mailto:info@eu-real-estate.com" color="inherit">info@eu-real-estate.com</Link>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('common:footer.phone')}: +49 123 456 7890
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mt: 6, mb: 4 }} />

        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" align={isMobile ? 'center' : 'left'}>
            © {currentYear} EU Real Estate Portal. {t('common:footer.rights')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: isMobile ? 2 : 0 }}>
            <Link href="#" color="inherit" variant="body2">
              {t('common:footer.sitemap')}
            </Link>
            <Link href="#" color="inherit" variant="body2">
              {t('common:footer.accessibility')}
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};