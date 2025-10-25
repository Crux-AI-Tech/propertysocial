import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Autocomplete,
  Alert,
  CircularProgress,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';

import { ImageUpload } from './ImageUpload';

interface PropertyFormData {
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: number;
  currency: string;
  
  // Address
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  
  // Features
  bedrooms: number;
  bathrooms: number;
  floorArea: number;
  lotSize?: number;
  yearBuilt?: number;
  
  // Amenities and features
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
  
  // Additional details
  energyRating?: string;
  condition: string;
  availability: string;
  availableFrom?: string;
  
  // Images and documents
  images: File[];
  documents: File[];
  
  // Tags
  tags: string[];
  
  // Contact
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

interface PropertyFormProps {
  initialData?: Partial<PropertyFormData>;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  onPreview?: (data: PropertyFormData) => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

const propertyTypes = [
  'APARTMENT',
  'HOUSE',
  'TOWNHOUSE',
  'VILLA',
  'STUDIO',
  'LOFT',
  'PENTHOUSE',
  'COMMERCIAL',
  'OFFICE',
  'RETAIL',
  'WAREHOUSE',
  'LAND',
];

const listingTypes = ['SALE', 'RENT'];

const currencies = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'];

const countries = [
  'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI',
  'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'RO', 'GR', 'CY', 'MT',
  'LU', 'LV', 'LT', 'EE', 'IE', 'PT',
];

const energyRatings = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

const conditions = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_RENOVATION'];

const availabilityOptions = ['IMMEDIATE', 'WITHIN_30_DAYS', 'WITHIN_60_DAYS', 'WITHIN_90_DAYS', 'NEGOTIABLE'];

export const PropertyForm = ({
  initialData,
  onSubmit,
  onPreview,
  isLoading = false,
  mode,
}: PropertyFormProps) => {
  const { t } = useTranslation(['property', 'common']);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Validation schema
  const validationSchema = Yup.object({
    title: Yup.string()
      .required(t('property:form.validation.titleRequired'))
      .min(10, t('property:form.validation.titleMinLength'))
      .max(100, t('property:form.validation.titleMaxLength')),
    description: Yup.string()
      .required(t('property:form.validation.descriptionRequired'))
      .min(50, t('property:form.validation.descriptionMinLength'))
      .max(2000, t('property:form.validation.descriptionMaxLength')),
    propertyType: Yup.string().required(t('property:form.validation.propertyTypeRequired')),
    listingType: Yup.string().required(t('property:form.validation.listingTypeRequired')),
    price: Yup.number()
      .required(t('property:form.validation.priceRequired'))
      .min(1, t('property:form.validation.priceMin')),
    currency: Yup.string().required(t('property:form.validation.currencyRequired')),
    street: Yup.string().required(t('property:form.validation.streetRequired')),
    city: Yup.string().required(t('property:form.validation.cityRequired')),
    postcode: Yup.string().required(t('property:form.validation.postcodeRequired')),
    country: Yup.string().required(t('property:form.validation.countryRequired')),
    bedrooms: Yup.number().min(0, t('property:form.validation.bedroomsMin')),
    bathrooms: Yup.number().min(0, t('property:form.validation.bathroomsMin')),
    floorArea: Yup.number()
      .required(t('property:form.validation.floorAreaRequired'))
      .min(1, t('property:form.validation.floorAreaMin')),
    contactName: Yup.string().required(t('property:form.validation.contactNameRequired')),
    contactPhone: Yup.string().required(t('property:form.validation.contactPhoneRequired')),
    contactEmail: Yup.string()
      .email(t('property:form.validation.contactEmailInvalid'))
      .required(t('property:form.validation.contactEmailRequired')),
  });

  // Form handling
  const formik = useFormik<PropertyFormData>({
    initialValues: {
      title: '',
      description: '',
      propertyType: '',
      listingType: '',
      price: 0,
      currency: 'EUR',
      street: '',
      city: '',
      state: '',
      postcode: '',
      country: '',
      bedrooms: 0,
      bathrooms: 0,
      floorArea: 0,
      lotSize: undefined,
      yearBuilt: undefined,
      furnished: false,
      petFriendly: false,
      parking: false,
      garden: false,
      balcony: false,
      elevator: false,
      airConditioning: false,
      heating: false,
      fireplace: false,
      pool: false,
      gym: false,
      security: false,
      energyRating: '',
      condition: 'GOOD',
      availability: 'IMMEDIATE',
      availableFrom: '',
      images: [],
      documents: [],
      tags: [],
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      ...initialData,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setSubmitError(null);
        await onSubmit(values);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : t('property:form.submitError'));
      }
    },
  });

  // Load available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        // TODO: Replace with actual API call
        const mockTags = [
          'luxury', 'modern', 'renovated', 'historic', 'waterfront', 'city-center',
          'quiet-area', 'family-friendly', 'investment', 'starter-home', 'move-in-ready',
          'fixer-upper', 'eco-friendly', 'smart-home', 'gated-community', 'walkable',
        ];
        setAvailableTags(mockTags);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, []);

  const handlePreview = () => {
    if (onPreview) {
      onPreview(formik.values);
    }
  };

  const handleImageUpload = (files: File[]) => {
    formik.setFieldValue('images', files);
  };

  const handleDocumentUpload = (files: File[]) => {
    formik.setFieldValue('documents', files);
  };

  return (
    <Box component="form" onSubmit={formik.handleSubmit}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      {/* Basic Information */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('property:form.sections.basicInfo')} />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="title"
                name="title"
                label={t('property:form.fields.title')}
                value={formik.values.title}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.title && Boolean(formik.errors.title)}
                helperText={formik.touched.title && formik.errors.title}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                id="description"
                name="description"
                label={t('property:form.fields.description')}
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={formik.touched.description && formik.errors.description}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.propertyType && Boolean(formik.errors.propertyType)}>
                <InputLabel id="propertyType-label">{t('property:form.fields.propertyType')}</InputLabel>
                <Select
                  labelId="propertyType-label"
                  id="propertyType"
                  name="propertyType"
                  value={formik.values.propertyType}
                  label={t('property:form.fields.propertyType')}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  {propertyTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {t(`property:types.${type.toLowerCase()}`)}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.propertyType && formik.errors.propertyType && (
                  <FormHelperText>{formik.errors.propertyType}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.listingType && Boolean(formik.errors.listingType)}>
                <InputLabel id="listingType-label">{t('property:form.fields.listingType')}</InputLabel>
                <Select
                  labelId="listingType-label"
                  id="listingType"
                  name="listingType"
                  value={formik.values.listingType}
                  label={t('property:form.fields.listingType')}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  {listingTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {t(`property:listingTypes.${type.toLowerCase()}`)}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.listingType && formik.errors.listingType && (
                  <FormHelperText>{formik.errors.listingType}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                type="number"
                id="price"
                name="price"
                label={t('property:form.fields.price')}
                value={formik.values.price}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.price && Boolean(formik.errors.price)}
                helperText={formik.touched.price && formik.errors.price}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="currency-label">{t('property:form.fields.currency')}</InputLabel>
                <Select
                  labelId="currency-label"
                  id="currency"
                  name="currency"
                  value={formik.values.currency}
                  label={t('property:form.fields.currency')}
                  onChange={formik.handleChange}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency} value={currency}>
                      {currency}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Location */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('property:form.sections.location')} />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="street"
                name="street"
                label={t('property:form.fields.street')}
                value={formik.values.street}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.street && Boolean(formik.errors.street)}
                helperText={formik.touched.street && formik.errors.street}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="city"
                name="city"
                label={t('property:form.fields.city')}
                value={formik.values.city}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.city && Boolean(formik.errors.city)}
                helperText={formik.touched.city && formik.errors.city}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="state"
                name="state"
                label={t('property:form.fields.state')}
                value={formik.values.state}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="postcode"
                name="postcode"
                label={t('property:form.fields.postcode')}
                value={formik.values.postcode}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.postcode && Boolean(formik.errors.postcode)}
                helperText={formik.touched.postcode && formik.errors.postcode}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.country && Boolean(formik.errors.country)}>
                <InputLabel id="country-label">{t('property:form.fields.country')}</InputLabel>
                <Select
                  labelId="country-label"
                  id="country"
                  name="country"
                  value={formik.values.country}
                  label={t('property:form.fields.country')}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  {countries.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.country && formik.errors.country && (
                  <FormHelperText>{formik.errors.country}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('property:form.sections.details')} />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                id="bedrooms"
                name="bedrooms"
                label={t('property:form.fields.bedrooms')}
                value={formik.values.bedrooms}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.bedrooms && Boolean(formik.errors.bedrooms)}
                helperText={formik.touched.bedrooms && formik.errors.bedrooms}
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                id="bathrooms"
                name="bathrooms"
                label={t('property:form.fields.bathrooms')}
                value={formik.values.bathrooms}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.bathrooms && Boolean(formik.errors.bathrooms)}
                helperText={formik.touched.bathrooms && formik.errors.bathrooms}
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                id="floorArea"
                name="floorArea"
                label={t('property:form.fields.floorArea')}
                value={formik.values.floorArea}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.floorArea && Boolean(formik.errors.floorArea)}
                helperText={formik.touched.floorArea && formik.errors.floorArea}
                InputProps={{
                  endAdornment: <InputAdornment position="end">m²</InputAdornment>,
                }}
                inputProps={{ min: 1 }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                id="lotSize"
                name="lotSize"
                label={t('property:form.fields.lotSize')}
                value={formik.values.lotSize || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                InputProps={{
                  endAdornment: <InputAdornment position="end">m²</InputAdornment>,
                }}
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                id="yearBuilt"
                name="yearBuilt"
                label={t('property:form.fields.yearBuilt')}
                value={formik.values.yearBuilt || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                inputProps={{ min: 1800, max: new Date().getFullYear() }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="energyRating-label">{t('property:form.fields.energyRating')}</InputLabel>
                <Select
                  labelId="energyRating-label"
                  id="energyRating"
                  name="energyRating"
                  value={formik.values.energyRating || ''}
                  label={t('property:form.fields.energyRating')}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">{t('common:notSpecified')}</MenuItem>
                  {energyRatings.map((rating) => (
                    <MenuItem key={rating} value={rating}>
                      {rating}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="condition-label">{t('property:form.fields.condition')}</InputLabel>
                <Select
                  labelId="condition-label"
                  id="condition"
                  name="condition"
                  value={formik.values.condition}
                  label={t('property:form.fields.condition')}
                  onChange={formik.handleChange}
                >
                  {conditions.map((condition) => (
                    <MenuItem key={condition} value={condition}>
                      {t(`property:conditions.${condition.toLowerCase()}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Features and Amenities */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('property:form.sections.features')} />
        <CardContent>
          <FormGroup>
            <Grid container spacing={2}>
              {[
                'furnished', 'petFriendly', 'parking', 'garden', 'balcony', 'elevator',
                'airConditioning', 'heating', 'fireplace', 'pool', 'gym', 'security'
              ].map((feature) => (
                <Grid item xs={12} sm={6} md={4} key={feature}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formik.values[feature as keyof PropertyFormData] as boolean}
                        onChange={(e) => formik.setFieldValue(feature, e.target.checked)}
                        name={feature}
                      />
                    }
                    label={t(`property:features.${feature}`)}
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('property:form.sections.availability')} />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="availability-label">{t('property:form.fields.availability')}</InputLabel>
                <Select
                  labelId="availability-label"
                  id="availability"
                  name="availability"
                  value={formik.values.availability}
                  label={t('property:form.fields.availability')}
                  onChange={formik.handleChange}
                >
                  {availabilityOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {t(`property:availability.${option.toLowerCase()}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                id="availableFrom"
                name="availableFrom"
                label={t('property:form.fields.availableFrom')}
                value={formik.values.availableFrom || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Images */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('property:form.sections.images')} />
        <CardContent>
          <ImageUpload
            images={formik.values.images}
            onImagesChange={handleImageUpload}
            maxImages={20}
          />
        </CardContent>
      </Card>

      {/* Tags */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('property:form.sections.tags')} />
        <CardContent>
          <Autocomplete
            multiple
            id="tags"
            options={availableTags}
            value={formik.values.tags}
            onChange={(_, newValue) => formik.setFieldValue('tags', newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('property:form.fields.tags')}
                placeholder={t('property:form.placeholders.tags')}
              />
            )}
          />
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('property:form.sections.contact')} />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="contactName"
                name="contactName"
                label={t('property:form.fields.contactName')}
                value={formik.values.contactName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.contactName && Boolean(formik.errors.contactName)}
                helperText={formik.touched.contactName && formik.errors.contactName}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                id="contactPhone"
                name="contactPhone"
                label={t('property:form.fields.contactPhone')}
                value={formik.values.contactPhone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.contactPhone && Boolean(formik.errors.contactPhone)}
                helperText={formik.touched.contactPhone && formik.errors.contactPhone}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="email"
                id="contactEmail"
                name="contactEmail"
                label={t('property:form.fields.contactEmail')}
                value={formik.values.contactEmail}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.contactEmail && Boolean(formik.errors.contactEmail)}
                helperText={formik.touched.contactEmail && formik.errors.contactEmail}
                required
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {onPreview && (
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            disabled={isLoading}
          >
            {t('property:form.actions.preview')}
          </Button>
        )}
        
        <LoadingButton
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
          loading={isLoading}
          loadingPosition="start"
        >
          {mode === 'create' ? t('property:form.actions.create') : t('property:form.actions.update')}
        </LoadingButton>
      </Box>
    </Box>
  );
};