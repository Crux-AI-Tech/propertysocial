import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import {
  Language as LanguageIcon,
  Check as CheckIcon,
  Public as PublicIcon,
} from '@mui/icons-material';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

interface Country {
  code: string;
  name: string;
  currency: string;
  dateFormat: string;
  flag?: string;
}

interface LanguageSelectorProps {
  showCountrySelector?: boolean;
  variant?: 'button' | 'menu' | 'compact';
  onLanguageChange?: (language: string) => void;
  onCountryChange?: (country: string) => void;
}

export const LanguageSelector = ({
  showCountrySelector = false,
  variant = 'button',
  onLanguageChange,
  onCountryChange,
}: LanguageSelectorProps) => {
  const { i18n, t } = useTranslation(['common', 'localization']);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [countryAnchorEl, setCountryAnchorEl] = useState<null | HTMLElement>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currentCountry, setCurrentCountry] = useState<string>('DE');
  const [isLoading, setIsLoading] = useState(false);

  const open = Boolean(anchorEl);
  const countryOpen = Boolean(countryAnchorEl);

  // Load supported languages and countries
  useEffect(() => {
    const fetchLocalizationData = async () => {
      try {
        const [languagesResponse, countriesResponse] = await Promise.all([
          fetch('/api/localization/supported-languages'),
          fetch('/api/localization/supported-countries'),
        ]);

        if (languagesResponse.ok) {
          const languagesData = await languagesResponse.json();
          setLanguages(languagesData.data.languages || []);
        }

        if (countriesResponse.ok) {
          const countriesData = await countriesResponse.json();
          setCountries(countriesData.data.countries || []);
        }
      } catch (error) {
        console.error('Error fetching localization data:', error);
        // Fallback to default languages
        setLanguages([
          { code: 'en', name: 'English', nativeName: 'English' },
          { code: 'de', name: 'German', nativeName: 'Deutsch' },
          { code: 'fr', name: 'French', nativeName: 'Français' },
          { code: 'es', name: 'Spanish', nativeName: 'Español' },
          { code: 'it', name: 'Italian', nativeName: 'Italiano' },
          { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
        ]);
      }
    };

    fetchLocalizationData();
  }, []);

  const handleLanguageClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCountryClick = (event: React.MouseEvent<HTMLElement>) => {
    setCountryAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCountryClose = () => {
    setCountryAnchorEl(null);
  };

  const handleLanguageChange = async (languageCode: string) => {
    setIsLoading(true);
    
    try {
      // Update i18n language
      await i18n.changeLanguage(languageCode);
      
      // Update user preference if authenticated
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/localization/language', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ language: languageCode }),
        });
      }
      
      // Call callback if provided
      if (onLanguageChange) {
        onLanguageChange(languageCode);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
      handleClose();
    }
  };

  const handleCountryChange = async (countryCode: string) => {
    setCurrentCountry(countryCode);
    
    try {
      // Update user country preference if authenticated
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ country: countryCode }),
        });
      }
      
      // Call callback if provided
      if (onCountryChange) {
        onCountryChange(countryCode);
      }
    } catch (error) {
      console.error('Error changing country:', error);
    } finally {
      handleCountryClose();
    }
  };

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === i18n.language) || languages[0];
  };

  const getCurrentCountry = () => {
    return countries.find(country => country.code === currentCountry);
  };

  const getFlagEmoji = (countryCode: string) => {
    // Convert country code to flag emoji
    const flagMap: Record<string, string> = {
      'DE': '🇩🇪', 'FR': '🇫🇷', 'ES': '🇪🇸', 'IT': '🇮🇹', 'NL': '🇳🇱',
      'BE': '🇧🇪', 'AT': '🇦🇹', 'CH': '🇨🇭', 'SE': '🇸🇪', 'NO': '🇳🇴',
      'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'HU': '🇭🇺',
      'SK': '🇸🇰', 'SI': '🇸🇮', 'HR': '🇭🇷', 'BG': '🇧🇬', 'RO': '🇷🇴',
      'GR': '🇬🇷', 'PT': '🇵🇹', 'IE': '🇮🇪', 'LU': '🇱🇺', 'CY': '🇨🇾',
      'MT': '🇲🇹', 'EE': '🇪🇪', 'LV': '🇱🇻', 'LT': '🇱🇹'
    };
    return flagMap[countryCode] || '🌍';
  };

  const getLanguageFlagEmoji = (languageCode: string) => {
    const languageFlagMap: Record<string, string> = {
      'en': '🇬🇧', 'de': '🇩🇪', 'fr': '🇫🇷', 'es': '🇪🇸', 'it': '🇮🇹',
      'nl': '🇳🇱', 'pt': '🇵🇹', 'pl': '🇵🇱', 'cs': '🇨🇿', 'hu': '🇭🇺',
      'sk': '🇸🇰', 'sl': '🇸🇮', 'hr': '🇭🇷', 'bg': '🇧🇬', 'ro': '🇷🇴',
      'el': '🇬🇷', 'sv': '🇸🇪', 'da': '🇩🇰', 'no': '🇳🇴', 'fi': '🇫🇮',
      'et': '🇪🇪', 'lv': '🇱🇻', 'lt': '🇱🇹'
    };
    return languageFlagMap[languageCode] || '🌍';
  };

  if (variant === 'compact') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          size="small"
          onClick={handleLanguageClick}
          startIcon={<span>{getLanguageFlagEmoji(i18n.language)}</span>}
          disabled={isLoading}
        >
          {i18n.language.toUpperCase()}
        </Button>
        
        {showCountrySelector && (
          <Button
            size="small"
            onClick={handleCountryClick}
            startIcon={<span>{getFlagEmoji(currentCountry)}</span>}
          >
            {currentCountry}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Language Selector */}
      <Button
        onClick={handleLanguageClick}
        startIcon={<LanguageIcon />}
        endIcon={<span>{getLanguageFlagEmoji(i18n.language)}</span>}
        disabled={isLoading}
        sx={{ textTransform: 'none' }}
      >
        {variant === 'menu' ? getCurrentLanguage()?.nativeName : i18n.language.toUpperCase()}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 200 },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('localization:selectLanguage')}
          </Typography>
        </Box>
        <Divider />
        
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={language.code === i18n.language}
          >
            <ListItemIcon>
              <span style={{ fontSize: '1.2em' }}>
                {getLanguageFlagEmoji(language.code)}
              </span>
            </ListItemIcon>
            <ListItemText
              primary={language.nativeName}
              secondary={language.name}
            />
            {language.code === i18n.language && (
              <CheckIcon color="primary" fontSize="small" />
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* Country Selector */}
      {showCountrySelector && (
        <>
          <Button
            onClick={handleCountryClick}
            startIcon={<PublicIcon />}
            endIcon={<span>{getFlagEmoji(currentCountry)}</span>}
            sx={{ textTransform: 'none' }}
          >
            {getCurrentCountry()?.name || currentCountry}
          </Button>

          <Menu
            anchorEl={countryAnchorEl}
            open={countryOpen}
            onClose={handleCountryClose}
            PaperProps={{
              sx: { minWidth: 250, maxHeight: 400 },
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('localization:selectCountry')}
              </Typography>
            </Box>
            <Divider />
            
            {countries.map((country) => (
              <MenuItem
                key={country.code}
                onClick={() => handleCountryChange(country.code)}
                selected={country.code === currentCountry}
              >
                <ListItemIcon>
                  <span style={{ fontSize: '1.2em' }}>
                    {getFlagEmoji(country.code)}
                  </span>
                </ListItemIcon>
                <ListItemText
                  primary={country.name}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={country.currency}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={country.dateFormat}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                />
                {country.code === currentCountry && (
                  <CheckIcon color="primary" fontSize="small" />
                )}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  );
};