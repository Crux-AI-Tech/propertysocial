import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Divider,
  Paper,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  PropertySocialShare,
  SocialSharePanel,
  SocialShareButton,
  socialPlatforms,
  platformGroups,
} from '../components/social';

const SocialShareDemo: React.FC = () => {
  const { t } = useTranslation();
  
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<'button' | 'icon' | 'menu' | 'panel'>('button');
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Mock property data
  const mockProperty = {
    id: 'demo-property-123',
    title: 'Luxury Apartment in Berlin Mitte',
    description: 'Stunning 3-bedroom apartment in the heart of Berlin with modern amenities, high ceilings, and panoramic city views. Perfect for professionals or families looking for premium living.',
    price: 750000,
    bedrooms: 3,
    bathrooms: 2,
    size: 120,
    propertyType: 'APARTMENT',
    listingType: 'SALE',
    location: {
      city: 'Berlin',
      country: 'Germany',
      address: 'Unter den Linden 1, 10117 Berlin',
    },
    features: {
      luxury: true,
      garden: false,
      parking: true,
      balcony: true,
      elevator: true,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        alt: 'Living room',
      },
    ],
    agent: {
      name: 'Sarah Johnson',
      email: 'sarah@eu-realestate.com',
      phone: '+49 30 12345678',
    },
  };

  const shareParams = {
    url: `${window.location.origin}/properties/${mockProperty.id}`,
    title: `${mockProperty.title} - €${mockProperty.price.toLocaleString()}`,
    description: mockProperty.description,
    image: mockProperty.images[0]?.url,
    hashtags: ['luxury', 'berlin', 'apartment', 'realestate', 'germany'],
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        Social Sharing Component Demo
      </Typography>
      <Typography variant="h6" color="text.secondary" align="center" paragraph>
        Comprehensive social media sharing for real estate listings
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* Demo Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Demo Controls
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Variant</InputLabel>
              <Select
                value={selectedVariant}
                label="Variant"
                onChange={(e) => setSelectedVariant(e.target.value as any)}
              >
                <MenuItem value="button">Button</MenuItem>
                <MenuItem value="icon">Icon</MenuItem>
                <MenuItem value="menu">Menu</MenuItem>
                <MenuItem value="panel">Panel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Size</InputLabel>
              <Select
                value={selectedSize}
                label="Size"
                onChange={(e) => setSelectedSize(e.target.value as any)}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={showAnalytics}
                  onChange={(e) => setShowAnalytics(e.target.checked)}
                />
              }
              label="Show Analytics"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Property Card with Social Sharing */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="img"
              height="200"
              image={mockProperty.images[0].url}
              alt={mockProperty.title}
            />
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {mockProperty.title}
              </Typography>
              <Typography variant="h5" color="primary" gutterBottom>
                €{mockProperty.price.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {mockProperty.description.substring(0, 150)}...
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="body2">
                  {mockProperty.bedrooms} bed • {mockProperty.bathrooms} bath • {mockProperty.size}m²
                </Typography>
                
                <PropertySocialShare
                  property={mockProperty}
                  variant={selectedVariant}
                  size={selectedSize}
                  showAnalytics={showAnalytics}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Social Share Panel
          </Typography>
          <SocialSharePanel
            shareParams={shareParams}
            platforms={platformGroups.realEstate}
            variant="native"
            size={selectedSize}
            showLabels={true}
            showStats={showAnalytics}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Individual Platform Buttons */}
      <Typography variant="h5" gutterBottom>
        Individual Platform Buttons
      </Typography>
      
      <Grid container spacing={3}>
        {/* Icon Variant */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Icon Variant
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {platformGroups.popular.map((platformId) => {
              const platform = socialPlatforms[platformId];
              return (
                <SocialShareButton
                  key={platformId}
                  platform={platform}
                  shareParams={shareParams}
                  variant="icon"
                  size={selectedSize}
                />
              );
            })}
          </Box>
        </Grid>

        {/* Button Variant */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Button Variant
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {platformGroups.social.map((platformId) => {
              const platform = socialPlatforms[platformId];
              return (
                <SocialShareButton
                  key={platformId}
                  platform={platform}
                  shareParams={shareParams}
                  variant="button"
                  size={selectedSize}
                  showLabel={true}
                />
              );
            })}
          </Box>
        </Grid>

        {/* Native Variant */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Native Variant
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {platformGroups.messaging.map((platformId) => {
              const platform = socialPlatforms[platformId];
              return (
                <SocialShareButton
                  key={platformId}
                  platform={platform}
                  shareParams={shareParams}
                  variant="native"
                  size={selectedSize}
                  showLabel={true}
                />
              );
            })}
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Features List */}
      <Typography variant="h5" gutterBottom>
        Features
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              10+
            </Typography>
            <Typography variant="body2">
              Social Platforms
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Native
            </Typography>
            <Typography variant="body2">
              App Integration
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Analytics
            </Typography>
            <Typography variant="body2">
              Share Tracking
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              Customizable
            </Typography>
            <Typography variant="body2">
              Content & Style
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SocialShareDemo;