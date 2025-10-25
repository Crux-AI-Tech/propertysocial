import { prisma } from '@eu-real-estate/database';
import { PropertyType, ListingType } from '@eu-real-estate/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

export interface ComplianceRule {
  id: string;
  country: string;
  propertyType: PropertyType;
  listingType: ListingType;
  requiredFields: string[];
  requiredDocuments: string[];
  disclosureRequirements: string[];
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'enum';
  value?: any;
  message: string;
}

export interface ComplianceValidationResult {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  requiredActions: RequiredAction[];
}

export interface ComplianceViolation {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  country: string;
}

export interface ComplianceWarning {
  field: string;
  message: string;
  recommendation: string;
}

export interface RequiredAction {
  action: string;
  description: string;
  deadline?: Date;
  priority: 'high' | 'medium' | 'low';
}

export class ComplianceService {
  // EU country-specific compliance rules
  private static readonly EU_COMPLIANCE_RULES: Record<string, ComplianceRule[]> = {
    DE: [ // Germany
      {
        id: 'de_residential_sale',
        country: 'DE',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.SALE,
        requiredFields: [
          'energyRating',
          'buildYear',
          'floorArea',
          'heatingType',
          'renovationYear',
          'maintenanceCosts',
        ],
        requiredDocuments: [
          'energy_certificate',
          'floor_plan',
          'property_deed',
          'building_permit',
        ],
        disclosureRequirements: [
          'energy_consumption',
          'renovation_needs',
          'noise_levels',
          'neighborhood_development_plans',
        ],
        validationRules: [
          {
            field: 'energyRating',
            type: 'required',
            message: 'Energy certificate is mandatory for all property sales in Germany',
          },
          {
            field: 'energyRating',
            type: 'enum',
            value: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            message: 'Energy rating must be valid German energy class',
          },
        ],
      },
      {
        id: 'de_residential_rent',
        country: 'DE',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.RENT,
        requiredFields: [
          'energyRating',
          'coldRent',
          'warmRent',
          'additionalCosts',
          'deposit',
          'minimumRentalPeriod',
        ],
        requiredDocuments: [
          'energy_certificate',
          'rental_agreement_template',
        ],
        disclosureRequirements: [
          'rent_control_status',
          'previous_rent_levels',
          'energy_consumption',
        ],
        validationRules: [
          {
            field: 'deposit',
            type: 'range',
            value: { max: 3 }, // Max 3 months rent
            message: 'Security deposit cannot exceed 3 months rent in Germany',
          },
        ],
      },
    ],
    FR: [ // France
      {
        id: 'fr_residential_sale',
        country: 'FR',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.SALE,
        requiredFields: [
          'energyRating',
          'ghgRating',
          'buildYear',
          'floorArea',
          'propertyTax',
          'coproprieteCharges',
        ],
        requiredDocuments: [
          'dpe_certificate', // Diagnostic de Performance Énergétique
          'asbestos_report',
          'lead_report',
          'termite_report',
          'gas_safety_certificate',
          'electrical_safety_certificate',
        ],
        disclosureRequirements: [
          'natural_disaster_risks',
          'noise_exposure',
          'soil_pollution',
          'copropriete_financial_status',
        ],
        validationRules: [
          {
            field: 'dpe_certificate',
            type: 'required',
            message: 'DPE certificate is mandatory for all property sales in France',
          },
        ],
      },
    ],
    ES: [ // Spain
      {
        id: 'es_residential_sale',
        country: 'ES',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.SALE,
        requiredFields: [
          'energyRating',
          'buildYear',
          'floorArea',
          'ibi_tax',
          'community_fees',
        ],
        requiredDocuments: [
          'energy_certificate',
          'habitability_certificate',
          'property_registry_note',
          'ibi_receipt',
        ],
        disclosureRequirements: [
          'energy_consumption',
          'community_rules',
          'pending_assessments',
        ],
        validationRules: [
          {
            field: 'energyRating',
            type: 'required',
            message: 'Energy certificate is mandatory for all property sales in Spain',
          },
        ],
      },
    ],
    IT: [ // Italy
      {
        id: 'it_residential_sale',
        country: 'IT',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.SALE,
        requiredFields: [
          'energyRating',
          'buildYear',
          'floorArea',
          'cadastralCategory',
          'cadastralIncome',
        ],
        requiredDocuments: [
          'ape_certificate', // Attestato di Prestazione Energetica
          'conformity_certificate',
          'cadastral_certificate',
        ],
        disclosureRequirements: [
          'energy_consumption',
          'seismic_classification',
          'urban_planning_constraints',
        ],
        validationRules: [
          {
            field: 'ape_certificate',
            type: 'required',
            message: 'APE certificate is mandatory for all property sales in Italy',
          },
        ],
      },
    ],
    NL: [ // Netherlands
      {
        id: 'nl_residential_sale',
        country: 'NL',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.SALE,
        requiredFields: [
          'energyLabel',
          'buildYear',
          'floorArea',
          'vve_contribution',
          'ground_lease',
        ],
        requiredDocuments: [
          'energy_label',
          'structural_survey',
          'vve_financial_report',
          'ground_lease_conditions',
        ],
        disclosureRequirements: [
          'energy_consumption',
          'vve_financial_status',
          'ground_lease_terms',
          'renovation_obligations',
        ],
        validationRules: [
          {
            field: 'energyLabel',
            type: 'required',
            message: 'Energy label is mandatory for all property sales in Netherlands',
          },
          {
            field: 'energyLabel',
            type: 'enum',
            value: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
            message: 'Energy label must be valid Dutch energy class',
          },
        ],
      },
    ],
  };

  /**
   * Validate property compliance for specific country
   */
  static async validatePropertyCompliance(
    propertyId: string,
    country: string
  ): Promise<ComplianceValidationResult> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          address: true,
          features: true,
          documents: true,
          amenities: true,
        },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      const countryRules = this.EU_COMPLIANCE_RULES[country] || [];
      const applicableRules = countryRules.filter(
        rule => rule.propertyType === property.propertyType && 
                rule.listingType === property.listingType
      );

      const violations: ComplianceViolation[] = [];
      const warnings: ComplianceWarning[] = [];
      const requiredActions: RequiredAction[] = [];

      for (const rule of applicableRules) {
        // Validate required fields
        for (const field of rule.requiredFields) {
          const fieldValue = this.getPropertyFieldValue(property, field);
          if (!fieldValue) {
            violations.push({
              field,
              rule: rule.id,
              message: `${field} is required for ${country} compliance`,
              severity: 'error',
              country,
            });
          }
        }

        // Validate required documents
        for (const docType of rule.requiredDocuments) {
          const hasDocument = property.documents.some(doc => 
            doc.type.toLowerCase().includes(docType.toLowerCase())
          );
          if (!hasDocument) {
            violations.push({
              field: 'documents',
              rule: rule.id,
              message: `${docType} document is required for ${country} compliance`,
              severity: 'error',
              country,
            });
            
            requiredActions.push({
              action: 'upload_document',
              description: `Upload ${docType} document`,
              priority: 'high',
            });
          }
        }

        // Apply validation rules
        for (const validationRule of rule.validationRules) {
          const fieldValue = this.getPropertyFieldValue(property, validationRule.field);
          const isValid = this.validateField(fieldValue, validationRule);
          
          if (!isValid) {
            violations.push({
              field: validationRule.field,
              rule: rule.id,
              message: validationRule.message,
              severity: 'error',
              country,
            });
          }
        }

        // Check disclosure requirements
        for (const disclosure of rule.disclosureRequirements) {
          const hasDisclosure = this.checkDisclosureRequirement(property, disclosure);
          if (!hasDisclosure) {
            warnings.push({
              field: disclosure,
              message: `${disclosure} disclosure recommended for ${country}`,
              recommendation: `Add ${disclosure} information to property description`,
            });
          }
        }
      }

      return {
        isCompliant: violations.length === 0,
        violations,
        warnings,
        requiredActions,
      };
    } catch (error) {
      logger.error('Validate property compliance error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Compliance validation failed', 500, 'COMPLIANCE_ERROR');
    }
  }

  /**
   * Get compliance requirements for country and property type
   */
  static getComplianceRequirements(
    country: string,
    propertyType: PropertyType,
    listingType: ListingType
  ): ComplianceRule | null {
    const countryRules = this.EU_COMPLIANCE_RULES[country] || [];
    return countryRules.find(
      rule => rule.propertyType === propertyType && rule.listingType === listingType
    ) || null;
  }

  /**
   * Get all supported countries
   */
  static getSupportedCountries(): string[] {
    return Object.keys(this.EU_COMPLIANCE_RULES);
  }

  /**
   * Generate compliance report for property
   */
  static async generateComplianceReport(propertyId: string): Promise<any> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          address: true,
          features: true,
          documents: true,
        },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      const country = property.address?.country;
      if (!country) {
        throw new AppError('Property country not specified', 400, 'COUNTRY_REQUIRED');
      }

      const validationResult = await this.validatePropertyCompliance(propertyId, country);
      const requirements = this.getComplianceRequirements(
        country,
        property.propertyType,
        property.listingType
      );

      return {
        propertyId,
        country,
        propertyType: property.propertyType,
        listingType: property.listingType,
        complianceStatus: validationResult.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
        validationResult,
        requirements,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Generate compliance report error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to generate compliance report', 500, 'REPORT_ERROR');
    }
  }

  /**
   * Update property to meet compliance requirements
   */
  static async updatePropertyForCompliance(
    propertyId: string,
    complianceData: Record<string, any>
  ): Promise<any> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { address: true, features: true },
      });

      if (!property) {
        throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
      }

      // Update property features with compliance data
      const updatedFeatures: any = {};
      
      // Map compliance data to property features
      if (complianceData.energyRating) {
        updatedFeatures.energyRating = complianceData.energyRating;
      }
      
      if (complianceData.buildYear) {
        updatedFeatures.buildYear = parseInt(complianceData.buildYear);
      }
      
      if (complianceData.heatingType) {
        updatedFeatures.heating = complianceData.heatingType;
      }

      // Update property features
      if (Object.keys(updatedFeatures).length > 0) {
        await prisma.propertyFeatures.upsert({
          where: { propertyId },
          create: {
            propertyId,
            ...updatedFeatures,
          },
          update: updatedFeatures,
        });
      }

      // Log compliance update
      await prisma.auditLog.create({
        data: {
          action: 'COMPLIANCE_UPDATE',
          resource: 'property',
          resourceId: propertyId,
          newData: JSON.stringify(complianceData),
          createdAt: new Date(),
        },
      });

      return await this.validatePropertyCompliance(propertyId, property.address?.country || 'DE');
    } catch (error) {
      logger.error('Update property for compliance error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update property compliance', 500, 'UPDATE_ERROR');
    }
  }

  /**
   * Get property field value
   */
  private static getPropertyFieldValue(property: any, field: string): any {
    // Check in different property sections
    if (property[field] !== undefined) return property[field];
    if (property.features?.[field] !== undefined) return property.features[field];
    if (property.address?.[field] !== undefined) return property.address[field];
    
    // Handle special field mappings
    switch (field) {
      case 'energyRating':
        return property.features?.energyRating;
      case 'buildYear':
        return property.features?.buildYear;
      case 'floorArea':
        return property.features?.floorArea;
      case 'heatingType':
        return property.features?.heating;
      default:
        return null;
    }
  }

  /**
   * Validate field against rule
   */
  private static validateField(value: any, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      
      case 'enum':
        return Array.isArray(rule.value) && rule.value.includes(value);
      
      case 'range':
        if (typeof value !== 'number') return false;
        const range = rule.value as { min?: number; max?: number };
        if (range.min !== undefined && value < range.min) return false;
        if (range.max !== undefined && value > range.max) return false;
        return true;
      
      case 'format':
        // Add format validation logic here
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Check disclosure requirement
   */
  private static checkDisclosureRequirement(property: any, disclosure: string): boolean {
    // This would check if the property has the required disclosure information
    // For now, we'll check if it's mentioned in the description
    const description = property.description?.toLowerCase() || '';
    const disclosureKeywords = disclosure.toLowerCase().split('_');
    
    return disclosureKeywords.some(keyword => description.includes(keyword));
  }

  /**
   * Get compliance dashboard data
   */
  static async getComplianceDashboard(userId: string): Promise<any> {
    try {
      const properties = await prisma.property.findMany({
        where: { ownerId: userId },
        include: {
          address: true,
          features: true,
          documents: true,
        },
      });

      const complianceStats = {
        totalProperties: properties.length,
        compliantProperties: 0,
        nonCompliantProperties: 0,
        pendingActions: 0,
        byCountry: {} as Record<string, any>,
      };

      const propertyCompliance = [];

      for (const property of properties) {
        const country = property.address?.country || 'DE';
        const validation = await this.validatePropertyCompliance(property.id, country);
        
        if (validation.isCompliant) {
          complianceStats.compliantProperties++;
        } else {
          complianceStats.nonCompliantProperties++;
        }
        
        complianceStats.pendingActions += validation.requiredActions.length;
        
        if (!complianceStats.byCountry[country]) {
          complianceStats.byCountry[country] = {
            total: 0,
            compliant: 0,
            nonCompliant: 0,
          };
        }
        
        complianceStats.byCountry[country].total++;
        if (validation.isCompliant) {
          complianceStats.byCountry[country].compliant++;
        } else {
          complianceStats.byCountry[country].nonCompliant++;
        }

        propertyCompliance.push({
          propertyId: property.id,
          title: property.title,
          country,
          isCompliant: validation.isCompliant,
          violationsCount: validation.violations.length,
          warningsCount: validation.warnings.length,
          actionsCount: validation.requiredActions.length,
        });
      }

      return {
        stats: complianceStats,
        properties: propertyCompliance,
        supportedCountries: this.getSupportedCountries(),
      };
    } catch (error) {
      logger.error('Get compliance dashboard error:', error);
      throw new AppError('Failed to get compliance dashboard', 500, 'DASHBOARD_ERROR');
    }
  }
}