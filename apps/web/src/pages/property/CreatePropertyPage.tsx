import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { PropertyForm } from '../../components/property/PropertyForm';
import { useAuth } from '../../hooks/useAuth';

interface PropertyFormData {
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: number;
  currency: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  floorArea: number;
  lotSize?: number;
  yearBuilt?: number;
  furnished: boolean;
  petFriendly: boolean;
  parking: boolean;
  garden: boolean;
  balcony: boolean;
  elevator: boolean;
  airConditioning: boolean;
  heating: boolean;
  fireplace: boolean;
  pool: boolean;
  gym: boolean;
  security: boolean;
  energyRating?: string;
  condition: string;
  availability: string;
  availableFrom?: string;
  images: File[];
  documents: File[];
  tags: string[];
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export const CreatePropertyPage = () => {
  const { t } = useTranslation(['property', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data: PropertyFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add basic property data
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'images' || key === 'documents') {
          // Handle file arrays separately
          (value as File[]).forEach((file, index) => {
            formData.append(`${key}[${index}]`, file);
          });
        } else if (key === 'tags') {
          // Handle tags array
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString());
        }
      });
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('property:create.submitError'));
      }
      
      const result = await response.json();
      
      setSuccess(true);
      
      // Redirect to property details page after a short delay
      setTimeout(() => {
        navigate(`/properties/${result.data.property.id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error creating property:', error);
      setError(error instanceof Error ? error.message : t('property:create.submitError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (data: PropertyFormData) => {
    // TODO: Implement preview functionality
    console.log('Preview data:', data);
  };

  // Get initial form data from user profile
  const getInitialData = (): Partial<PropertyFormData> => {
    if (!user) return {};
    
    return {
      contactName: `${user.firstName} ${user.lastName}`,
      contactEmail: user.email,
      contactPhone: user.profile?.phone || '',
      currency: 'EUR', // Default to EUR for EU market
    };
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link component={RouterLink} to="/" underline="hover">
          {t('common:home')}
        </Link>
        <Link component={RouterLink} to="/dashboard" underline="hover">
          {t('common:dashboard')}
        </Link>
        <Typography color="text.primary">
          {t('property:create.title')}
        </Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('property:create.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('property:create.subtitle')}
        </Typography>
      </Box>

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('property:create.successMessage')}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Property Form */}
      <PropertyForm
        initialData={getInitialData()}
        onSubmit={handleSubmit}
        onPreview={handlePreview}
        isLoading={isLoading}
        mode="create"
      />
    </Container>
  );
};