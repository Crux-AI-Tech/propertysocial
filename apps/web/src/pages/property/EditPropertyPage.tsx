import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  Skeleton,
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

interface Property {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: number;
  currency: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postcode: string;
    country: string;
  };
  features: {
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
  };
  energyRating?: string;
  condition: string;
  availability: string;
  availableFrom?: string;
  images: string[];
  documents: string[];
  tags: { tag: { name: string } }[];
  owner: {
    firstName: string;
    lastName: string;
    email: string;
    profile?: {
      phone?: string;
    };
  };
}

export const EditPropertyPage = () => {
  const { t } = useTranslation(['property', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load property data
  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      
      setIsLoadingProperty(true);
      setError(null);
      
      try {
        // Fetch property data from API
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:7500/api';
        const response = await fetch(`${apiUrl}/properties/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(t('property:edit.notFound'));
          }
          if (response.status === 403) {
            throw new Error(t('property:edit.notAuthorized'));
          }
          throw new Error(t('property:edit.loadError'));
        }
        
        const result = await response.json();
        setProperty(result.data.property);
        
      } catch (error) {
        console.error('Error loading property:', error);
        setError(error instanceof Error ? error.message : t('property:edit.loadError'));
      } finally {
        setIsLoadingProperty(false);
      }
    };
    
    fetchProperty();
  }, [id, t]);

  const handleSubmit = async (data: PropertyFormData) => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Update property via API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:7500/api';
      const response = await fetch(`${apiUrl}/properties/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('property:edit.submitError'));
      }
      
      setSuccess(true);
      
      // Redirect to property details page after a short delay
      setTimeout(() => {
        navigate(`/properties/${id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error updating property:', error);
      setError(error instanceof Error ? error.message : t('property:edit.submitError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (data: PropertyFormData) => {
    // TODO: Implement preview functionality
    console.log('Preview data:', data);
  };

  // Convert property data to form data
  const getFormData = (): Partial<PropertyFormData> => {
    if (!property) return {};
    
    return {
      title: property.title,
      description: property.description,
      propertyType: property.propertyType,
      listingType: property.listingType,
      price: property.price,
      currency: property.currency,
      street: property.address.street,
      city: property.address.city,
      state: property.address.state || '',
      postcode: property.address.postcode,
      country: property.address.country,
      bedrooms: property.features.bedrooms,
      bathrooms: property.features.bathrooms,
      floorArea: property.features.floorArea,
      lotSize: property.features.lotSize,
      yearBuilt: property.features.yearBuilt,
      furnished: property.features.furnished,
      petFriendly: property.features.petFriendly,
      parking: property.features.parking,
      garden: property.features.garden,
      balcony: property.features.balcony,
      elevator: property.features.elevator,
      airConditioning: property.features.airConditioning,
      heating: property.features.heating,
      fireplace: property.features.fireplace,
      pool: property.features.pool,
      gym: property.features.gym,
      security: property.features.security,
      energyRating: property.energyRating,
      condition: property.condition,
      availability: property.availability,
      availableFrom: property.availableFrom,
      images: [], // Images will be handled separately
      documents: [], // Documents will be handled separately
      tags: property.tags.map(tag => tag.tag.name),
      contactName: `${property.owner.firstName} ${property.owner.lastName}`,
      contactPhone: property.owner.profile?.phone || '',
      contactEmail: property.owner.email,
    };
  };

  // Check if user can edit this property
  const canEdit = user && property && (
    user.id === property.owner.id || 
    user.role === 'ADMIN'
  );

  if (isLoadingProperty) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={500} height={24} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!property) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {t('property:edit.notFound')}
        </Alert>
      </Container>
    );
  }

  if (!canEdit) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {t('property:edit.notAuthorized')}
        </Alert>
      </Container>
    );
  }

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
        <Link component={RouterLink} to={`/properties/${id}`} underline="hover">
          {property.title}
        </Link>
        <Typography color="text.primary">
          {t('property:edit.title')}
        </Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('property:edit.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('property:edit.subtitle')}
        </Typography>
      </Box>

      {/* Success Message */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('property:edit.successMessage')}
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
        initialData={getFormData()}
        onSubmit={handleSubmit}
        onPreview={handlePreview}
        isLoading={isLoading}
        mode="edit"
      />
    </Container>
  );
};