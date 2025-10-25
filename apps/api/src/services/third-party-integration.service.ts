import { logger } from '../utils/logger';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface IntegrationConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enabled: boolean;
}

export interface PropertyValuation {
  propertyId: string;
  estimatedValue: number;
  currency: string;
  confidence: number;
  lastUpdated: Date;
  source: string;
  comparables?: Array<{
    address: string;
    price: number;
    size: number;
    distance: number;
  }>;
}

export interface MortgageQuote {
  lenderId: string;
  lenderName: string;
  interestRate: number;
  monthlyPayment: number;
  totalAmount: number;
  term: number;
  currency: string;
  conditions: string[];
  validUntil: Date;
}

export interface LegalService {
  providerId: string;
  providerName: string;
  serviceType: 'conveyancing' | 'property_law' | 'contract_review';
  estimatedCost: number;
  currency: string;
  estimatedDuration: number;
  languages: string[];
  jurisdictions: string[];
  rating: number;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'bank_transfer' | 'digital_wallet';
  countries: string[];
  currencies: string[];
  processingFee: number;
  processingTime: string;
  enabled: boolean;
}

export class ThirdPartyIntegrationService {
  private static integrations: Map<string, AxiosInstance> = new Map();
  
  private static readonly CONFIGS: Record<string, IntegrationConfig> = {
    // Property valuation services
    EUROPEAN_PROPERTY_DATA: {
      name: 'European Property Data',
      baseUrl: process.env.EPD_API_URL || 'https://api.europeanpropertydata.com',
      apiKey: process.env.EPD_API_KEY,
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      enabled: !!process.env.EPD_API_KEY,
    },
    PROPERTY_RADAR: {
      name: 'Property Radar',
      baseUrl: process.env.PROPERTY_RADAR_API_URL || 'https://api.propertyradar.eu',
      apiKey: process.env.PROPERTY_RADAR_API_KEY,
      timeout: 8000,
      retryAttempts: 2,
      retryDelay: 1500,
      enabled: !!process.env.PROPERTY_RADAR_API_KEY,
    },
    
    // Mortgage broker services
    EU_MORTGAGE_BROKER: {
      name: 'EU Mortgage Broker',
      baseUrl: process.env.EU_MORTGAGE_API_URL || 'https://api.eumortgagebroker.com',
      apiKey: process.env.EU_MORTGAGE_API_KEY,
      timeout: 15000,
      retryAttempts: 2,
      retryDelay: 2000,
      enabled: !!process.env.EU_MORTGAGE_API_KEY,
    },
    MORTGAGE_FINDER: {
      name: 'Mortgage Finder',
      baseUrl: process.env.MORTGAGE_FINDER_API_URL || 'https://api.mortgagefinder.eu',
      apiKey: process.env.MORTGAGE_FINDER_API_KEY,
      timeout: 12000,
      retryAttempts: 3,
      retryDelay: 1000,
      enabled: !!process.env.MORTGAGE_FINDER_API_KEY,
    },
    
    // Legal services
    EU_LEGAL_SERVICES: {
      name: 'EU Legal Services',
      baseUrl: process.env.EU_LEGAL_API_URL || 'https://api.eulegalservices.com',
      apiKey: process.env.EU_LEGAL_API_KEY,
      timeout: 10000,
      retryAttempts: 2,
      retryDelay: 1500,
      enabled: !!process.env.EU_LEGAL_API_KEY,
    },
    
    // Payment gateways
    STRIPE: {
      name: 'Stripe',
      baseUrl: 'https://api.stripe.com/v1',
      apiKey: process.env.STRIPE_SECRET_KEY,
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      enabled: !!process.env.STRIPE_SECRET_KEY,
    },
    ADYEN: {
      name: 'Adyen',
      baseUrl: process.env.ADYEN_API_URL || 'https://checkout-test.adyen.com/v70',
      apiKey: process.env.ADYEN_API_KEY,
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      enabled: !!process.env.ADYEN_API_KEY,
    },
    
    // Google Maps
    GOOGLE_MAPS: {
      name: 'Google Maps',
      baseUrl: 'https://maps.googleapis.com/maps/api',
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      timeout: 8000,
      retryAttempts: 2,
      retryDelay: 1000,
      enabled: !!process.env.GOOGLE_MAPS_API_KEY,
    },
    
    // Email services
    SENDGRID: {
      name: 'SendGrid',
      baseUrl: 'https://api.sendgrid.com/v3',
      apiKey: process.env.SENDGRID_API_KEY,
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      enabled: !!process.env.SENDGRID_API_KEY,
    },
    
    // SMS services
    TWILIO: {
      name: 'Twilio',
      baseUrl: 'https://api.twilio.com/2010-04-01',
      apiKey: process.env.TWILIO_AUTH_TOKEN,
      timeout: 8000,
      retryAttempts: 2,
      retryDelay: 1500,
      enabled: !!process.env.TWILIO_AUTH_TOKEN,
    },
  };

  /**
   * Initialize all third-party integrations
   */
  static initialize(): void {
    Object.entries(this.CONFIGS).forEach(([key, config]) => {
      if (config.enabled) {
        this.integrations.set(key, this.createAxiosInstance(config));
        logger.info(`Initialized integration: ${config.name}`);
      } else {
        logger.warn(`Integration disabled (missing API key): ${config.name}`);
      }
    });
  }

  /**
   * Get property valuation from multiple sources
   */
  static async getPropertyValuation(
    address: string,
    propertyType: string,
    size: number,
    country: string
  ): Promise<PropertyValuation[]> {
    const valuations: PropertyValuation[] = [];
    
    // Try European Property Data
    if (this.integrations.has('EUROPEAN_PROPERTY_DATA')) {
      try {
        const epd = await this.getEPDValuation(address, propertyType, size, country);
        if (epd) valuations.push(epd);
      } catch (error) {
        logger.error('EPD valuation error:', error);
      }
    }
    
    // Try Property Radar
    if (this.integrations.has('PROPERTY_RADAR')) {
      try {
        const radar = await this.getPropertyRadarValuation(address, propertyType, size, country);
        if (radar) valuations.push(radar);
      } catch (error) {
        logger.error('Property Radar valuation error:', error);
      }
    }
    
    return valuations;
  }

  /**
   * Get mortgage quotes from brokers
   */
  static async getMortgageQuotes(
    propertyValue: number,
    downPayment: number,
    income: number,
    country: string,
    currency: string = 'EUR'
  ): Promise<MortgageQuote[]> {
    const quotes: MortgageQuote[] = [];
    
    // Try EU Mortgage Broker
    if (this.integrations.has('EU_MORTGAGE_BROKER')) {
      try {
        const brokerQuotes = await this.getEUMortgageQuotes(
          propertyValue, downPayment, income, country, currency
        );
        quotes.push(...brokerQuotes);
      } catch (error) {
        logger.error('EU Mortgage Broker error:', error);
      }
    }
    
    // Try Mortgage Finder
    if (this.integrations.has('MORTGAGE_FINDER')) {
      try {
        const finderQuotes = await this.getMortgageFinderQuotes(
          propertyValue, downPayment, income, country, currency
        );
        quotes.push(...finderQuotes);
      } catch (error) {
        logger.error('Mortgage Finder error:', error);
      }
    }
    
    return quotes.sort((a, b) => a.interestRate - b.interestRate);
  }

  /**
   * Get legal service providers
   */
  static async getLegalServices(
    serviceType: 'conveyancing' | 'property_law' | 'contract_review',
    country: string,
    language: string = 'en'
  ): Promise<LegalService[]> {
    const services: LegalService[] = [];
    
    if (this.integrations.has('EU_LEGAL_SERVICES')) {
      try {
        const legalServices = await this.getEULegalServices(serviceType, country, language);
        services.push(...legalServices);
      } catch (error) {
        logger.error('EU Legal Services error:', error);
      }
    }
    
    return services.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get available payment methods for country
   */
  static async getPaymentMethods(country: string, currency: string = 'EUR'): Promise<PaymentMethod[]> {
    const methods: PaymentMethod[] = [];
    
    // Stripe payment methods
    if (this.integrations.has('STRIPE')) {
      try {
        const stripeMethods = await this.getStripePaymentMethods(country, currency);
        methods.push(...stripeMethods);
      } catch (error) {
        logger.error('Stripe payment methods error:', error);
      }
    }
    
    // Adyen payment methods
    if (this.integrations.has('ADYEN')) {
      try {
        const adyenMethods = await this.getAdyenPaymentMethods(country, currency);
        methods.push(...adyenMethods);
      } catch (error) {
        logger.error('Adyen payment methods error:', error);
      }
    }
    
    return methods.filter(method => method.enabled);
  }

  /**
   * Geocode address using Google Maps
   */
  static async geocodeAddress(address: string, country?: string): Promise<{
    lat: number;
    lng: number;
    formattedAddress: string;
    components: any;
  } | null> {
    if (!this.integrations.has('GOOGLE_MAPS')) {
      logger.warn('Google Maps integration not available');
      return null;
    }
    
    try {
      const client = this.integrations.get('GOOGLE_MAPS')!;
      const params = {
        address: country ? `${address}, ${country}` : address,
        key: this.CONFIGS.GOOGLE_MAPS.apiKey,
      };
      
      const response = await client.get('/geocode/json', { params });
      
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          components: result.address_components,
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Send multilingual email
   */
  static async sendEmail(
    to: string,
    templateId: string,
    data: any,
    language: string = 'en'
  ): Promise<boolean> {
    if (!this.integrations.has('SENDGRID')) {
      logger.warn('SendGrid integration not available');
      return false;
    }
    
    try {
      const client = this.integrations.get('SENDGRID')!;
      
      const emailData = {
        personalizations: [{
          to: [{ email: to }],
          dynamic_template_data: {
            ...data,
            language,
          },
        }],
        template_id: templateId,
        from: {
          email: process.env.FROM_EMAIL || 'noreply@eu-real-estate.com',
          name: 'EU Real Estate Portal',
        },
      };
      
      await client.post('/mail/send', emailData);
      return true;
    } catch (error) {
      logger.error('Email sending error:', error);
      return false;
    }
  }

  /**
   * Send SMS with country-specific formatting
   */
  static async sendSMS(
    phoneNumber: string,
    message: string,
    country: string
  ): Promise<boolean> {
    if (!this.integrations.has('TWILIO')) {
      logger.warn('Twilio integration not available');
      return false;
    }
    
    try {
      const client = this.integrations.get('TWILIO')!;
      
      // Format phone number for country
      const formattedNumber = this.formatPhoneNumber(phoneNumber, country);
      
      const smsData = {
        to: formattedNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: message,
      };
      
      await client.post('/Messages.json', smsData, {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID || '',
          password: process.env.TWILIO_AUTH_TOKEN || '',
        },
      });
      
      return true;
    } catch (error) {
      logger.error('SMS sending error:', error);
      return false;
    }
  }

  /**
   * Get integration health status
   */
  static async getIntegrationHealth(): Promise<Record<string, {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime?: number;
    lastChecked: Date;
    error?: string;
  }>> {
    const health: Record<string, any> = {};
    
    for (const [key, client] of this.integrations.entries()) {
      const config = this.CONFIGS[key];
      const startTime = Date.now();
      
      try {
        // Simple health check - try to make a basic request
        await client.get('/health', { timeout: 5000 });
        
        health[key] = {
          name: config.name,
          status: 'healthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
        };
      } catch (error: any) {
        health[key] = {
          name: config.name,
          status: error.code === 'ECONNABORTED' ? 'degraded' : 'down',
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          error: error.message,
        };
      }
    }
    
    return health;
  }

  /**
   * Create axios instance with retry logic
   */
  private static createAxiosInstance(config: IntegrationConfig): AxiosInstance {
    const instance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined,
        'Content-Type': 'application/json',
        'User-Agent': 'EU-Real-Estate-Portal/1.0',
      },
    });

    // Add retry interceptor
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config: requestConfig } = error;
        
        if (!requestConfig || requestConfig.__retryCount >= config.retryAttempts) {
          return Promise.reject(error);
        }
        
        requestConfig.__retryCount = requestConfig.__retryCount || 0;
        requestConfig.__retryCount++;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        
        return instance(requestConfig);
      }
    );

    return instance;
  }

  /**
   * Get EPD property valuation
   */
  private static async getEPDValuation(
    address: string,
    propertyType: string,
    size: number,
    country: string
  ): Promise<PropertyValuation | null> {
    const client = this.integrations.get('EUROPEAN_PROPERTY_DATA')!;
    
    const response = await client.post('/valuation', {
      address,
      property_type: propertyType,
      size,
      country,
    });
    
    if (response.data.success) {
      return {
        propertyId: response.data.property_id,
        estimatedValue: response.data.estimated_value,
        currency: response.data.currency,
        confidence: response.data.confidence,
        lastUpdated: new Date(response.data.last_updated),
        source: 'European Property Data',
        comparables: response.data.comparables,
      };
    }
    
    return null;
  }

  /**
   * Get Property Radar valuation
   */
  private static async getPropertyRadarValuation(
    address: string,
    propertyType: string,
    size: number,
    country: string
  ): Promise<PropertyValuation | null> {
    const client = this.integrations.get('PROPERTY_RADAR')!;
    
    const response = await client.get('/property/valuation', {
      params: { address, type: propertyType, size, country },
    });
    
    if (response.data.status === 'success') {
      return {
        propertyId: response.data.id,
        estimatedValue: response.data.value,
        currency: response.data.currency,
        confidence: response.data.confidence_score,
        lastUpdated: new Date(response.data.updated_at),
        source: 'Property Radar',
      };
    }
    
    return null;
  }

  /**
   * Get EU Mortgage Broker quotes
   */
  private static async getEUMortgageQuotes(
    propertyValue: number,
    downPayment: number,
    income: number,
    country: string,
    currency: string
  ): Promise<MortgageQuote[]> {
    const client = this.integrations.get('EU_MORTGAGE_BROKER')!;
    
    const response = await client.post('/quotes', {
      property_value: propertyValue,
      down_payment: downPayment,
      annual_income: income,
      country,
      currency,
    });
    
    return response.data.quotes.map((quote: any) => ({
      lenderId: quote.lender_id,
      lenderName: quote.lender_name,
      interestRate: quote.interest_rate,
      monthlyPayment: quote.monthly_payment,
      totalAmount: quote.total_amount,
      term: quote.term_years,
      currency: quote.currency,
      conditions: quote.conditions,
      validUntil: new Date(quote.valid_until),
    }));
  }

  /**
   * Get Mortgage Finder quotes
   */
  private static async getMortgageFinderQuotes(
    propertyValue: number,
    downPayment: number,
    income: number,
    country: string,
    currency: string
  ): Promise<MortgageQuote[]> {
    const client = this.integrations.get('MORTGAGE_FINDER')!;
    
    const response = await client.get('/mortgage-quotes', {
      params: {
        property_value: propertyValue,
        down_payment: downPayment,
        income,
        country,
        currency,
      },
    });
    
    return response.data.results.map((quote: any) => ({
      lenderId: quote.id,
      lenderName: quote.name,
      interestRate: quote.rate,
      monthlyPayment: quote.monthly_payment,
      totalAmount: quote.total_cost,
      term: quote.term,
      currency: quote.currency,
      conditions: quote.terms,
      validUntil: new Date(quote.expires_at),
    }));
  }

  /**
   * Get EU Legal Services
   */
  private static async getEULegalServices(
    serviceType: string,
    country: string,
    language: string
  ): Promise<LegalService[]> {
    const client = this.integrations.get('EU_LEGAL_SERVICES')!;
    
    const response = await client.get('/providers', {
      params: { service_type: serviceType, country, language },
    });
    
    return response.data.providers.map((provider: any) => ({
      providerId: provider.id,
      providerName: provider.name,
      serviceType: provider.service_type,
      estimatedCost: provider.estimated_cost,
      currency: provider.currency,
      estimatedDuration: provider.estimated_duration_days,
      languages: provider.languages,
      jurisdictions: provider.jurisdictions,
      rating: provider.rating,
      contact: provider.contact,
    }));
  }

  /**
   * Get Stripe payment methods
   */
  private static async getStripePaymentMethods(
    country: string,
    currency: string
  ): Promise<PaymentMethod[]> {
    // Mock implementation - in real scenario, this would call Stripe API
    const stripeMethods: PaymentMethod[] = [
      {
        id: 'stripe_card',
        name: 'Credit/Debit Card',
        type: 'card',
        countries: ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT'],
        currencies: ['EUR', 'GBP'],
        processingFee: 2.9,
        processingTime: 'Instant',
        enabled: true,
      },
      {
        id: 'stripe_sepa',
        name: 'SEPA Direct Debit',
        type: 'bank_transfer',
        countries: ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT'],
        currencies: ['EUR'],
        processingFee: 0.8,
        processingTime: '3-5 business days',
        enabled: true,
      },
    ];
    
    return stripeMethods.filter(method => 
      method.countries.includes(country) && method.currencies.includes(currency)
    );
  }

  /**
   * Get Adyen payment methods
   */
  private static async getAdyenPaymentMethods(
    country: string,
    currency: string
  ): Promise<PaymentMethod[]> {
    // Mock implementation - in real scenario, this would call Adyen API
    const adyenMethods: PaymentMethod[] = [
      {
        id: 'adyen_ideal',
        name: 'iDEAL',
        type: 'bank_transfer',
        countries: ['NL'],
        currencies: ['EUR'],
        processingFee: 0.35,
        processingTime: 'Instant',
        enabled: true,
      },
      {
        id: 'adyen_sofort',
        name: 'Sofort',
        type: 'bank_transfer',
        countries: ['DE', 'AT', 'BE', 'NL'],
        currencies: ['EUR'],
        processingFee: 0.9,
        processingTime: 'Instant',
        enabled: true,
      },
    ];
    
    return adyenMethods.filter(method => 
      method.countries.includes(country) && method.currencies.includes(currency)
    );
  }

  /**
   * Format phone number for country
   */
  private static formatPhoneNumber(phoneNumber: string, country: string): string {
    // Simple country code mapping - in real scenario, use a proper library
    const countryCodes: Record<string, string> = {
      'DE': '+49',
      'FR': '+33',
      'ES': '+34',
      'IT': '+39',
      'NL': '+31',
      'BE': '+32',
      'AT': '+43',
    };
    
    const countryCode = countryCodes[country] || '+1';
    
    // Remove any existing country code and format
    const cleanNumber = phoneNumber.replace(/^\+\d{1,3}/, '').replace(/\D/g, '');
    
    return `${countryCode}${cleanNumber}`;
  }
}

// Initialize integrations on module load
ThirdPartyIntegrationService.initialize();