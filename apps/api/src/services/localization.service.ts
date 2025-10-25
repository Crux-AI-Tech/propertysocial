import { prisma, redis } from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { handlePrismaError } from '@eu-real-estate/database';
import { logger } from '../utils/logger';

export interface LocalizationConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  supportedCountries: string[];
  currencyByCountry: Record<string, string>;
  dateFormatByCountry: Record<string, string>;
  numberFormatByCountry: Record<string, Intl.NumberFormatOptions>;
}

export interface TranslationEntry {
  key: string;
  language: string;
  value: string;
  context?: string;
  pluralForm?: string;
  namespace?: string;
}

export interface LocalizedContent {
  propertyTypes: Record<string, Record<string, string>>;
  amenities: Record<string, Record<string, string>>;
  legalDocuments: Record<string, Record<string, string>>;
  emailTemplates: Record<string, Record<string, string>>;
  validationMessages: Record<string, Record<string, string>>;
}

export class LocalizationService {
  private static readonly CACHE_TTL = 3600; // 1 hour
  
  // EU localization configuration
  private static readonly CONFIG: LocalizationConfig = {
    defaultLanguage: 'en',
    supportedLanguages: [
      'en', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 
      'cs', 'hu', 'sk', 'sl', 'hr', 'bg', 'ro', 'el',
      'sv', 'da', 'no', 'fi', 'et', 'lv', 'lt'
    ],
    supportedCountries: [
      'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI',
      'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'RO', 'GR', 'CY', 'MT',
      'LU', 'LV', 'LT', 'EE', 'IE', 'PT'
    ],
    currencyByCountry: {
      'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
      'BE': 'EUR', 'AT': 'EUR', 'LU': 'EUR', 'IE': 'EUR', 'PT': 'EUR',
      'GR': 'EUR', 'CY': 'EUR', 'MT': 'EUR', 'SI': 'EUR', 'SK': 'EUR',
      'EE': 'EUR', 'LV': 'EUR', 'LT': 'EUR', 'FI': 'EUR',
      'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK',
      'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'HR': 'HRK',
      'BG': 'BGN', 'RO': 'RON'
    },
    dateFormatByCountry: {
      'DE': 'dd.MM.yyyy', 'FR': 'dd/MM/yyyy', 'ES': 'dd/MM/yyyy',
      'IT': 'dd/MM/yyyy', 'NL': 'dd-MM-yyyy', 'BE': 'dd/MM/yyyy',
      'AT': 'dd.MM.yyyy', 'CH': 'dd.MM.yyyy', 'SE': 'yyyy-MM-dd',
      'NO': 'dd.MM.yyyy', 'DK': 'dd-MM-yyyy', 'FI': 'dd.MM.yyyy',
      'PL': 'dd.MM.yyyy', 'CZ': 'dd.MM.yyyy', 'HU': 'yyyy.MM.dd',
      'SK': 'dd.MM.yyyy', 'SI': 'dd.MM.yyyy', 'HR': 'dd.MM.yyyy',
      'BG': 'dd.MM.yyyy', 'RO': 'dd.MM.yyyy', 'GR': 'dd/MM/yyyy',
      'PT': 'dd-MM-yyyy', 'IE': 'dd/MM/yyyy', 'LU': 'dd/MM/yyyy',
      'CY': 'dd/MM/yyyy', 'MT': 'dd/MM/yyyy', 'EE': 'dd.MM.yyyy',
      'LV': 'dd.MM.yyyy', 'LT': 'yyyy-MM-dd'
    },
    numberFormatByCountry: {
      'DE': { locale: 'de-DE' }, 'FR': { locale: 'fr-FR' },
      'ES': { locale: 'es-ES' }, 'IT': { locale: 'it-IT' },
      'NL': { locale: 'nl-NL' }, 'BE': { locale: 'nl-BE' },
      'AT': { locale: 'de-AT' }, 'CH': { locale: 'de-CH' },
      'SE': { locale: 'sv-SE' }, 'NO': { locale: 'nb-NO' },
      'DK': { locale: 'da-DK' }, 'FI': { locale: 'fi-FI' },
      'PL': { locale: 'pl-PL' }, 'CZ': { locale: 'cs-CZ' },
      'HU': { locale: 'hu-HU' }, 'SK': { locale: 'sk-SK' },
      'SI': { locale: 'sl-SI' }, 'HR': { locale: 'hr-HR' },
      'BG': { locale: 'bg-BG' }, 'RO': { locale: 'ro-RO' },
      'GR': { locale: 'el-GR' }, 'PT': { locale: 'pt-PT' },
      'IE': { locale: 'en-IE' }, 'LU': { locale: 'fr-LU' },
      'CY': { locale: 'el-CY' }, 'MT': { locale: 'mt-MT' },
      'EE': { locale: 'et-EE' }, 'LV': { locale: 'lv-LV' },
      'LT': { locale: 'lt-LT' }
    }
  };
}  /**

   * Get localization configuration
   */
  static getConfig(): LocalizationConfig {
    return this.CONFIG;
  }

  /**
   * Detect user language from request
   */
  static detectLanguage(
    acceptLanguage?: string,
    userPreference?: string,
    country?: string
  ): string {
    // Priority: user preference > country default > accept-language > default
    if (userPreference && this.CONFIG.supportedLanguages.includes(userPreference)) {
      return userPreference;
    }

    // Map country to default language
    if (country) {
      const countryLanguageMap: Record<string, string> = {
        'DE': 'de', 'AT': 'de', 'CH': 'de',
        'FR': 'fr', 'BE': 'fr', 'LU': 'fr',
        'ES': 'es', 'IT': 'it', 'NL': 'nl',
        'PT': 'pt', 'PL': 'pl', 'CZ': 'cs',
        'HU': 'hu', 'SK': 'sk', 'SI': 'sl',
        'HR': 'hr', 'BG': 'bg', 'RO': 'ro',
        'GR': 'el', 'SE': 'sv', 'DK': 'da',
        'NO': 'no', 'FI': 'fi', 'EE': 'et',
        'LV': 'lv', 'LT': 'lt', 'IE': 'en',
        'CY': 'el', 'MT': 'en'
      };
      
      const countryLang = countryLanguageMap[country];
      if (countryLang && this.CONFIG.supportedLanguages.includes(countryLang)) {
        return countryLang;
      }
    }

    // Parse Accept-Language header
    if (acceptLanguage) {
      const languages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase())
        .filter(lang => this.CONFIG.supportedLanguages.includes(lang));
      
      if (languages.length > 0) {
        return languages[0];
      }
    }

    return this.CONFIG.defaultLanguage;
  }

  /**
   * Format currency for country
   */
  static formatCurrency(
    amount: number,
    country: string,
    language?: string
  ): string {
    const currency = this.CONFIG.currencyByCountry[country] || 'EUR';
    const locale = language || this.detectLanguage(undefined, undefined, country);
    const numberFormat = this.CONFIG.numberFormatByCountry[country];
    
    return new Intl.NumberFormat(numberFormat?.locale || `${locale}-${country}`, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format date for country
   */
  static formatDate(
    date: Date,
    country: string,
    language?: string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const locale = language || this.detectLanguage(undefined, undefined, country);
    const numberFormat = this.CONFIG.numberFormatByCountry[country];
    
    return new Intl.DateTimeFormat(numberFormat?.locale || `${locale}-${country}`, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options,
    }).format(date);
  }

  /**
   * Format number for country
   */
  static formatNumber(
    number: number,
    country: string,
    language?: string,
    options?: Intl.NumberFormatOptions
  ): string {
    const locale = language || this.detectLanguage(undefined, undefined, country);
    const numberFormat = this.CONFIG.numberFormatByCountry[country];
    
    return new Intl.NumberFormat(numberFormat?.locale || `${locale}-${country}`, {
      ...numberFormat,
      ...options,
    }).format(number);
  }

  /**
   * Get localized property types
   */
  static async getLocalizedPropertyTypes(language: string): Promise<Record<string, string>> {
    const cacheKey = `property_types:${language}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Default property types with translations
      const propertyTypes: Record<string, Record<string, string>> = {
        'APARTMENT': {
          'en': 'Apartment',
          'de': 'Wohnung',
          'fr': 'Appartement',
          'es': 'Apartamento',
          'it': 'Appartamento',
          'nl': 'Appartement',
          'pt': 'Apartamento',
          'pl': 'Mieszkanie',
          'cs': 'Byt',
          'hu': 'Lakás',
          'sk': 'Byt',
          'sl': 'Stanovanje',
          'hr': 'Stan',
          'bg': 'Апартамент',
          'ro': 'Apartament',
          'el': 'Διαμέρισμα',
          'sv': 'Lägenhet',
          'da': 'Lejlighed',
          'no': 'Leilighet',
          'fi': 'Asunto',
          'et': 'Korter',
          'lv': 'Dzīvoklis',
          'lt': 'Butas'
        },
        'HOUSE': {
          'en': 'House',
          'de': 'Haus',
          'fr': 'Maison',
          'es': 'Casa',
          'it': 'Casa',
          'nl': 'Huis',
          'pt': 'Casa',
          'pl': 'Dom',
          'cs': 'Dům',
          'hu': 'Ház',
          'sk': 'Dom',
          'sl': 'Hiša',
          'hr': 'Kuća',
          'bg': 'Къща',
          'ro': 'Casă',
          'el': 'Σπίτι',
          'sv': 'Hus',
          'da': 'Hus',
          'no': 'Hus',
          'fi': 'Talo',
          'et': 'Maja',
          'lv': 'Māja',
          'lt': 'Namas'
        },
        'COMMERCIAL': {
          'en': 'Commercial',
          'de': 'Gewerbe',
          'fr': 'Commercial',
          'es': 'Comercial',
          'it': 'Commerciale',
          'nl': 'Commercieel',
          'pt': 'Comercial',
          'pl': 'Komercyjne',
          'cs': 'Komerční',
          'hu': 'Kereskedelmi',
          'sk': 'Komerčné',
          'sl': 'Komercialno',
          'hr': 'Komercijalno',
          'bg': 'Търговско',
          'ro': 'Comercial',
          'el': 'Εμπορικό',
          'sv': 'Kommersiell',
          'da': 'Kommerciel',
          'no': 'Kommersiell',
          'fi': 'Kaupallinen',
          'et': 'Äri',
          'lv': 'Komerciāls',
          'lt': 'Komercinis'
        }
      };

      const localized: Record<string, string> = {};
      Object.entries(propertyTypes).forEach(([key, translations]) => {
        localized[key] = translations[language] || translations['en'];
      });

      await redis.set(cacheKey, JSON.stringify(localized), this.CACHE_TTL);
      return localized;
    } catch (error) {
      logger.error('Get localized property types error:', error);
      return {};
    }
  }

  /**
   * Get localized amenities
   */
  static async getLocalizedAmenities(language: string): Promise<Record<string, string>> {
    const cacheKey = `amenities:${language}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const amenities: Record<string, Record<string, string>> = {
        'parking': {
          'en': 'Parking',
          'de': 'Parkplatz',
          'fr': 'Parking',
          'es': 'Aparcamiento',
          'it': 'Parcheggio',
          'nl': 'Parkeren',
          'pt': 'Estacionamento'
        },
        'garden': {
          'en': 'Garden',
          'de': 'Garten',
          'fr': 'Jardin',
          'es': 'Jardín',
          'it': 'Giardino',
          'nl': 'Tuin',
          'pt': 'Jardim'
        },
        'balcony': {
          'en': 'Balcony',
          'de': 'Balkon',
          'fr': 'Balcon',
          'es': 'Balcón',
          'it': 'Balcone',
          'nl': 'Balkon',
          'pt': 'Varanda'
        },
        'elevator': {
          'en': 'Elevator',
          'de': 'Aufzug',
          'fr': 'Ascenseur',
          'es': 'Ascensor',
          'it': 'Ascensore',
          'nl': 'Lift',
          'pt': 'Elevador'
        },
        'furnished': {
          'en': 'Furnished',
          'de': 'Möbliert',
          'fr': 'Meublé',
          'es': 'Amueblado',
          'it': 'Arredato',
          'nl': 'Gemeubileerd',
          'pt': 'Mobilado'
        }
      };

      const localized: Record<string, string> = {};
      Object.entries(amenities).forEach(([key, translations]) => {
        localized[key] = translations[language] || translations['en'];
      });

      await redis.set(cacheKey, JSON.stringify(localized), this.CACHE_TTL);
      return localized;
    } catch (error) {
      logger.error('Get localized amenities error:', error);
      return {};
    }
  }

  /**
   * Get localized legal document templates
   */
  static async getLegalDocumentTemplate(
    documentType: string,
    country: string,
    language: string
  ): Promise<string | null> {
    const cacheKey = `legal_doc:${documentType}:${country}:${language}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically come from a database or file system
      const templates: Record<string, Record<string, Record<string, string>>> = {
        'rental_agreement': {
          'DE': {
            'de': `MIETVERTRAG

Zwischen dem Vermieter:
{{landlord_name}}
{{landlord_address}}

und dem Mieter:
{{tenant_name}}
{{tenant_address}}

wird folgender Mietvertrag geschlossen:

§ 1 Mietobjekt
Das vermietete Objekt befindet sich in:
{{property_address}}

§ 2 Mietzeit
Der Mietvertrag beginnt am {{start_date}} und läuft auf unbestimmte Zeit.

§ 3 Miete
Die monatliche Kaltmiete beträgt {{cold_rent}} EUR.
Die Nebenkosten betragen {{additional_costs}} EUR.

§ 4 Kaution
Die Kaution beträgt {{deposit}} EUR.`,
            'en': `RENTAL AGREEMENT

Between the landlord:
{{landlord_name}}
{{landlord_address}}

and the tenant:
{{tenant_name}}
{{tenant_address}}

the following rental agreement is concluded:

§ 1 Rental Property
The rented property is located at:
{{property_address}}

§ 2 Rental Period
The rental agreement begins on {{start_date}} and runs indefinitely.

§ 3 Rent
The monthly base rent is {{cold_rent}} EUR.
Additional costs amount to {{additional_costs}} EUR.

§ 4 Security Deposit
The security deposit amounts to {{deposit}} EUR.`
          }
        }
      };

      const template = templates[documentType]?.[country]?.[language];
      if (template) {
        await redis.set(cacheKey, template, this.CACHE_TTL);
      }
      
      return template || null;
    } catch (error) {
      logger.error('Get legal document template error:', error);
      return null;
    }
  }

  /**
   * Get localized email template
   */
  static async getEmailTemplate(
    templateType: string,
    language: string
  ): Promise<{ subject: string; html: string } | null> {
    const cacheKey = `email_template:${templateType}:${language}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const templates: Record<string, Record<string, { subject: string; html: string }>> = {
        'welcome': {
          'en': {
            subject: 'Welcome to EU Real Estate Portal',
            html: `<h1>Welcome {{firstName}}!</h1>
                   <p>Thank you for joining our platform.</p>`
          },
          'de': {
            subject: 'Willkommen bei EU Real Estate Portal',
            html: `<h1>Willkommen {{firstName}}!</h1>
                   <p>Vielen Dank, dass Sie unserer Plattform beigetreten sind.</p>`
          },
          'fr': {
            subject: 'Bienvenue sur EU Real Estate Portal',
            html: `<h1>Bienvenue {{firstName}} !</h1>
                   <p>Merci de rejoindre notre plateforme.</p>`
          }
        },
        'property_match': {
          'en': {
            subject: 'New Property Match Found',
            html: `<h1>New Property Match</h1>
                   <p>We found a property that matches your search criteria.</p>`
          },
          'de': {
            subject: 'Neue Immobilie gefunden',
            html: `<h1>Neue Immobilie gefunden</h1>
                   <p>Wir haben eine Immobilie gefunden, die Ihren Suchkriterien entspricht.</p>`
          }
        }
      };

      const template = templates[templateType]?.[language] || templates[templateType]?.['en'];
      if (template) {
        await redis.set(cacheKey, JSON.stringify(template), this.CACHE_TTL);
      }
      
      return template || null;
    } catch (error) {
      logger.error('Get email template error:', error);
      return null;
    }
  }

  /**
   * Update user language preference
   */
  static async updateUserLanguage(userId: string, language: string): Promise<void> {
    try {
      if (!this.CONFIG.supportedLanguages.includes(language)) {
        throw new AppError('Unsupported language', 400, 'UNSUPPORTED_LANGUAGE');
      }

      await prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          language,
        },
        update: {
          language,
        },
      });

      // Clear user-specific caches
      const cacheKeys = await redis.keys(`user:${userId}:*`);
      if (cacheKeys.length > 0) {
        await redis.del(...cacheKeys);
      }
    } catch (error) {
      logger.error('Update user language error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get user's localization context
   */
  static async getUserLocalizationContext(userId: string): Promise<{
    language: string;
    country: string;
    currency: string;
    dateFormat: string;
    numberFormat: Intl.NumberFormatOptions;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          preferences: true,
          profile: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const language = user.preferences?.language || this.CONFIG.defaultLanguage;
      const country = user.profile?.country || 'DE';
      const currency = this.CONFIG.currencyByCountry[country] || 'EUR';
      const dateFormat = this.CONFIG.dateFormatByCountry[country] || 'dd.MM.yyyy';
      const numberFormat = this.CONFIG.numberFormatByCountry[country] || { locale: 'en-US' };

      return {
        language,
        country,
        currency,
        dateFormat,
        numberFormat,
      };
    } catch (error) {
      logger.error('Get user localization context error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(handlePrismaError(error), 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Clear localization cache
   */
  static async clearCache(pattern?: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern || 'property_types:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Clear localization cache error:', error);
    }
  }
}