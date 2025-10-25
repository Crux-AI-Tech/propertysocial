import { useTranslation } from 'react-i18next';
import {
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Typography,
  Checkbox,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

interface PropertySearchFiltersProps {
  filters: {
    propertyType: string;
    listingType: string;
    minPrice: number;
    maxPrice: number;
    minBedrooms: number;
    maxBedrooms: number;
    minBathrooms: number;
    country: string;
    city: string;
    features: {
      garden: boolean;
      parking: boolean;
      balcony: boolean;
      elevator: boolean;
      furnished: boolean;
    };
  };
  onFilterChange: (name: string, value: any) => void;
  onFeatureChange: (feature: string, checked: boolean) => void;
}

export const PropertySearchFilters = ({
  filters,
  onFilterChange,
  onFeatureChange,
}: PropertySearchFiltersProps) => {
  const { t } = useTranslation(['property', 'common']);

  // Price range marks
  const priceMarks = [
    { value: 0, label: '€0' },
    { value: 500000, label: '€500k' },
    { value: 1000000, label: '€1M' },
    { value: 1500000, label: '€1.5M' },
    { value: 2000000, label: '€2M+' },
  ];

  // Bedroom marks
  const bedroomMarks = [
    { value: 0, label: '0' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5+' },
  ];

  // Format price for display
  const formatPrice = (value: number) => {
    if (value === 0) return '€0';
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`;
    return `€${value}`;
  };

  // Handle price range change
  const handlePriceChange = (_event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      onFilterChange('minPrice', newValue[0]);
      onFilterChange('maxPrice', newValue[1]);
    }
  };

  // Handle bedroom range change
  const handleBedroomChange = (_event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      onFilterChange('minBedrooms', newValue[0]);
      onFilterChange('maxBedrooms', newValue[1]);
    }
  };

  return (
    <Box>
      {/* Property Type */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="property-type-filter-label">{t('property:search.propertyType')}</InputLabel>
        <Select
          labelId="property-type-filter-label"
          id="property-type-filter"
          value={filters.propertyType}
          label={t('property:search.propertyType')}
          onChange={(e) => onFilterChange('propertyType', e.target.value)}
        >
          <MenuItem value="">{t('common:all')}</MenuItem>
          <MenuItem value="APARTMENT">{t('property:types.apartment')}</MenuItem>
          <MenuItem value="HOUSE">{t('property:types.house')}</MenuItem>
          <MenuItem value="COMMERCIAL">{t('property:types.commercial')}</MenuItem>
          <MenuItem value="LAND">{t('property:types.land')}</MenuItem>
        </Select>
      </FormControl>

      {/* Listing Type */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="listing-type-filter-label">{t('property:search.listingType')}</InputLabel>
        <Select
          labelId="listing-type-filter-label"
          id="listing-type-filter"
          value={filters.listingType}
          label={t('property:search.listingType')}
          onChange={(e) => onFilterChange('listingType', e.target.value)}
        >
          <MenuItem value="">{t('common:all')}</MenuItem>
          <MenuItem value="SALE">{t('property:listingTypes.sale')}</MenuItem>
          <MenuItem value="RENT">{t('property:listingTypes.rent')}</MenuItem>
        </Select>
      </FormControl>

      {/* Price Range */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('property:search.priceRange')}
        </Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            value={[filters.minPrice, filters.maxPrice]}
            onChange={handlePriceChange}
            valueLabelDisplay="auto"
            valueLabelFormat={formatPrice}
            min={0}
            max={2000000}
            step={10000}
            marks={priceMarks}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatPrice(filters.minPrice)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatPrice(filters.maxPrice)}
          </Typography>
        </Box>
      </Box>

      {/* Bedrooms */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('property:search.bedrooms')}
        </Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            value={[filters.minBedrooms, filters.maxBedrooms]}
            onChange={handleBedroomChange}
            valueLabelDisplay="auto"
            min={0}
            max={5}
            step={1}
            marks={bedroomMarks}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {filters.minBedrooms}+ {t('property:features.bedrooms')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filters.maxBedrooms === 5 ? '5+' : filters.maxBedrooms} {t('property:features.bedrooms')}
          </Typography>
        </Box>
      </Box>

      {/* Location */}
      <Accordion defaultExpanded sx={{ mb: 3, boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ p: 0, minHeight: 'auto' }}
        >
          <Typography variant="subtitle2">{t('property:search.location')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="country-filter-label">{t('property:search.country')}</InputLabel>
            <Select
              labelId="country-filter-label"
              id="country-filter"
              value={filters.country}
              label={t('property:search.country')}
              onChange={(e) => onFilterChange('country', e.target.value)}
            >
              <MenuItem value="">{t('common:all')}</MenuItem>
              <MenuItem value="DE">Germany</MenuItem>
              <MenuItem value="FR">France</MenuItem>
              <MenuItem value="ES">Spain</MenuItem>
              <MenuItem value="IT">Italy</MenuItem>
              <MenuItem value="NL">Netherlands</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('property:search.city')}
            value={filters.city}
            onChange={(e) => onFilterChange('city', e.target.value)}
          />
        </AccordionDetails>
      </Accordion>

      {/* Features */}
      <Accordion defaultExpanded sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ p: 0, minHeight: 'auto' }}
        >
          <Typography variant="subtitle2">{t('property:search.features')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, pt: 2 }}>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.features.garden}
                  onChange={(e) => onFeatureChange('garden', e.target.checked)}
                />
              }
              label={t('property:features.garden')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.features.parking}
                  onChange={(e) => onFeatureChange('parking', e.target.checked)}
                />
              }
              label={t('property:features.parking')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.features.balcony}
                  onChange={(e) => onFeatureChange('balcony', e.target.checked)}
                />
              }
              label={t('property:features.balcony')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.features.elevator}
                  onChange={(e) => onFeatureChange('elevator', e.target.checked)}
                />
              }
              label={t('property:features.elevator')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.features.furnished}
                  onChange={(e) => onFeatureChange('furnished', e.target.checked)}
                />
              }
              label={t('property:features.furnished')}
            />
          </FormGroup>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};