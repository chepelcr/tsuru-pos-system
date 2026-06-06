/**
 * Tax Type Configuration for Costa Rica (Hacienda)
 *
 * This configuration maps each tax type code to its specific requirements and behavior.
 * Based on Costa Rica's Ministerio de Hacienda electronic invoicing specifications.
 *
 * Note: this file still uses literal code strings ("01", "02"…) as RECORD KEYS
 * because the data source itself is keyed by the Hacienda code. Lookups from
 * application code MUST go through `TaxTypeCode.*` (see `@/lib/enums`) so the
 * literals never leak into business logic.
 */
import { TaxTypeCode } from '@/lib/enums';

export interface TaxTypeConfig {
  /** Hacienda tax code (e.g., '01' for IVA) */
  code: string;
  
  /** Human-readable name for the tax type */
  name: string;
  
  /** Whether this is an IVA-type tax (01, 07, 08) */
  iva: boolean;
  
  /** Whether this tax requires special fields (quantity, percentage, volume, tax_amount_id) */
  requiresSpecialFields: boolean;
  
  /** Whether this tax requires a rate/percentage input */
  requireRate: boolean;
  
  /** Fixed rate if applicable (e.g., ISC is always 5%) */
  fixedRate: number | null;
  
  /** Whether this tax should be added to the base amount for IVA calculation */
  forBaseAmount: boolean;
  
  /** Whether this tax can be assumed by factory (cargo por fábrica) */
  forFactoryTax: boolean;
  
  /** Whether this tax requires a tax factor (e.g., IVARBU) */
  requiresFactor: boolean;
  
  /** Whether this tax requires a tax rate selection (e.g., IVA rates) */
  requiresRateSelection: boolean;
  
  /** Whether this tax requires tax amount lookup (e.g., IUC, ISEBA, ISEBEC, IPT) */
  requiresTaxAmount: boolean;
  
  /** Special calculation notes */
  calculationNotes?: string;
}

/**
 * Complete mapping of Costa Rican tax types
 * 
 * Tax Codes:
 * - 01: IVA (Impuesto al Valor Agregado) - Standard VAT
 * - 02: ISC (Impuesto Selectivo de Consumo) - Selective consumption tax
 * - 03: IUC (Impuesto Único a los Combustibles) - Fuel tax
 * - 04: ISEBA (Impuesto Específico sobre las Bebidas Alcohólicas) - Alcoholic beverages tax
 * - 05: ISEBEC (Impuesto Específico sobre las Bebidas Envasadas sin Contenido Alcohólico y Jabones de Tocador) - Non-alcoholic beverages and soaps tax
 * - 06: IPT (Impuesto a los Productos de Tabaco) - Tobacco products tax
 * - 07: IVACE (IVA para Compras Autorizadas) - IVA for authorized purchases
 * - 08: IVARBU (IVA Régimen de Bienes Usados) - IVA for used goods regime
 * - 12: ISEC (Impuesto Específico de Consumo) - Specific consumption tax (fixed 5%)
 * - 99: OTROS (Otros Impuestos) - Other taxes
 */
export const TAX_TYPE_CONFIGS: Record<string, TaxTypeConfig> = {
  // ========== IVA TAXES ==========
  '01': {
    code: '01',
    name: 'IVA',
    iva: true,
    requiresSpecialFields: false,
    requireRate: false,
    fixedRate: null,
    forBaseAmount: false,
    forFactoryTax: false,
    requiresFactor: false,
    requiresRateSelection: true,
    requiresTaxAmount: false,
    calculationNotes: 'Applied to base amount (subtotal + special taxes). Rate selected from tax_rates table.',
  },
  
  '07': {
    code: '07',
    name: 'IVACE',
    iva: true,
    requiresSpecialFields: false,
    requireRate: false,
    fixedRate: null,
    forBaseAmount: false,
    forFactoryTax: false,
    requiresFactor: false,
    requiresRateSelection: true,
    requiresTaxAmount: false,
    calculationNotes: 'IVA for authorized purchases. Same calculation as IVA (01).',
  },
  
  '08': {
    code: '08',
    name: 'IVARBU',
    iva: true,
    requiresSpecialFields: false,
    requireRate: false,
    fixedRate: null,
    forBaseAmount: false,
    forFactoryTax: false,
    requiresFactor: true,
    requiresRateSelection: false,
    requiresTaxAmount: false,
    calculationNotes: 'IVA for used goods. Calculated as: factor × subtotal. Factor selected from tax_factors table.',
  },
  
  // ========== SPECIAL CONSUMPTION TAXES ==========
  '02': {
    code: '02',
    name: 'ISC',
    iva: false,
    requiresSpecialFields: false,
    requireRate: true,
    fixedRate: null,
    forBaseAmount: true,
    forFactoryTax: false,
    requiresFactor: false,
    requiresRateSelection: false,
    requiresTaxAmount: false,
    calculationNotes: 'Selective consumption tax. Applied to subtotal. Added to base amount for IVA calculation.',
  },
  
  '12': {
    code: '12',
    name: 'ISEC',
    iva: false,
    requiresSpecialFields: false,
    requireRate: false,
    fixedRate: 5.0,
    forBaseAmount: true,
    forFactoryTax: true,
    requiresFactor: false,
    requiresRateSelection: false,
    requiresTaxAmount: false,
    calculationNotes: 'Specific consumption tax with fixed 5% rate. Applied to subtotal. Can be assumed by factory.',
  },
  
  // ========== SPECIAL TAXES WITH AMOUNTS ==========
  '03': {
    code: '03',
    name: 'IUC',
    iva: false,
    requiresSpecialFields: true,
    requireRate: false,
    fixedRate: null,
    forBaseAmount: false,
    forFactoryTax: true,
    requiresFactor: false,
    requiresRateSelection: false,
    requiresTaxAmount: true,
    calculationNotes: 'Fuel tax. Calculated as: quantity × tax_amount. Requires tax_amount_id and quantity fields.',
  },
  
  '04': {
    code: '04',
    name: 'ISEBA',
    iva: false,
    requiresSpecialFields: true,
    requireRate: false,
    fixedRate: null,
    forBaseAmount: true,
    forFactoryTax: true,
    requiresFactor: false,
    requiresRateSelection: false,
    requiresTaxAmount: true,
    calculationNotes: 'Alcoholic beverages tax. Calculated as: detail_quantity × (quantity × percentage/100) × tax_amount. Requires tax_amount_id, quantity, and percentage fields.',
  },
  
  '05': {
    code: '05',
    name: 'ISEBEC',
    iva: false,
    requiresSpecialFields: true,
    requireRate: false,
    fixedRate: null,
    forBaseAmount: true,
    forFactoryTax: true,
    requiresFactor: false,
    requiresRateSelection: false,
    requiresTaxAmount: true,
    calculationNotes: 'Non-alcoholic beverages and soaps tax. For alcoholic (CABYS 3401): quantity × volume_consumption × tax_amount. For non-alcoholic (CABYS 2202): detail_quantity × quantity × (tax_amount / volume_consumption). Requires tax_amount_id, quantity, volume_consumption, and optionally percentage (for alcoholic).',
  },
  
  '06': {
    code: '06',
    name: 'IPT',
    iva: false,
    requiresSpecialFields: true,
    requireRate: false,
    fixedRate: null,
    forBaseAmount: false,
    forFactoryTax: true,
    requiresFactor: false,
    requiresRateSelection: false,
    requiresTaxAmount: true,
    calculationNotes: 'Tobacco products tax. Calculated as: detail_quantity × quantity × tax_amount. Requires tax_amount_id and quantity fields.',
  },
  
  // ========== OTHER TAXES ==========
  '99': {
    code: '99',
    name: 'OTROS',
    iva: false,
    requiresSpecialFields: false,
    requireRate: true,
    fixedRate: null,
    forBaseAmount: false,
    forFactoryTax: false,
    requiresFactor: false,
    requiresRateSelection: false,
    requiresTaxAmount: false,
    calculationNotes: 'Other taxes. Applied to base amount (after special taxes). User enters custom percentage.',
  },
};

/**
 * Get tax configuration by code
 * @param code - Hacienda tax code (e.g., '01', '02', etc.)
 * @returns Tax configuration or undefined if code not found
 */
export function getTaxConfig(code?: string): TaxTypeConfig | undefined {
  if (!code) return undefined;
  return TAX_TYPE_CONFIGS[code];
}

/**
 * Check if a tax code is an IVA-type tax
 * @param code - Hacienda tax code
 * @returns true if the tax is IVA, IVACE, or IVARBU
 */
export function isIvaTax(code?: string): boolean {
  if (!code) return false;
  return (
    code === TaxTypeCode.IVA ||
    code === TaxTypeCode.IVACE ||
    code === TaxTypeCode.IVARBU
  );
}

/**
 * Check if a tax code requires special fields
 * @param code - Hacienda tax code
 * @returns true if the tax requires special fields (quantity, percentage, volume, tax_amount_id)
 */
export function requiresSpecialFields(code?: string): boolean {
  const config = getTaxConfig(code);
  return config?.requiresSpecialFields ?? false;
}

/**
 * Check if a tax code can be assumed by factory (cargo por fábrica)
 * @param code - Hacienda tax code
 * @returns true if the tax can be assumed by factory
 */
export function canBeAssumedByFactory(code?: string): boolean {
  const config = getTaxConfig(code);
  return config?.forFactoryTax ?? false;
}

/**
 * Get all IVA tax codes
 * @returns Array of IVA tax codes
 */
export function getIvaTaxCodes(): string[] {
  return [TaxTypeCode.IVA, TaxTypeCode.IVACE, TaxTypeCode.IVARBU];
}

/**
 * Get all special tax codes (those requiring tax amounts)
 * @returns Array of special tax codes
 */
export function getSpecialTaxCodes(): string[] {
  return [
    TaxTypeCode.IUC,
    TaxTypeCode.ISEBA,
    TaxTypeCode.ISEBEC,
    TaxTypeCode.IPT,
  ];
}
