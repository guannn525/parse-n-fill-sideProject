/**
 * Converter Utilities
 *
 * Functions to convert CustomFinancialModelOutput to other formats,
 * particularly the other_branch's financial-calculations.service format.
 *
 * This enables PARSE-N-FILL to extract data from documents and
 * populate the income module in other_branch.
 */

import type { CustomFinancialModelOutput, LineItemWithSource } from '../types';

// =============================================================================
// OTHER_BRANCH FORMAT TYPES
// =============================================================================

/**
 * Revenue row format used by other_branch
 * Matches: other_branch/src/stores/types.ts RevenueRow
 */
export interface OtherBranchRevenueRow {
  id: string;
  unit: string;
  squareFeet: number | null;
  monthlyRate: number | null;
  annualIncome: number | null;
  effectiveAnnualIncome: number | null;
  isVacant: boolean;
  operatingVacancyAndCreditLoss: number;
  tenantName?: string;
  marketRent?: number | null;
  rentVariance?: number | null;
  leaseExpiry?: string;
}

/**
 * Revenue stream format used by other_branch
 * Matches: other_branch/src/stores/types.ts RevenueStream
 */
export interface OtherBranchRevenueStream {
  id: string;
  name: string;
  category: 'Residential' | 'Commercial' | 'Miscellaneous';
  rows: OtherBranchRevenueRow[];
  vacancyRate?: number;
  totals?: {
    grossRevenue: number;
    effectiveRevenue: number;
    squareFootage: number;
  };
}

/**
 * Expense row format used by other_branch
 * Matches: other_branch/src/stores/types.ts ExpenseRow
 */
export interface OtherBranchExpenseRow {
  id: string;
  name: string;
  amount: number | null;
  calculationMethod: 'direct' | 'percentage' | 'perMetric';
  percentageValue?: number;
  perMetricValue?: number;
  lastModifiedMethod: 'direct' | 'percentage' | 'perMetric';
  dataSource?: string;
}

/**
 * Valuation data format used by other_branch
 */
export interface OtherBranchValuationData {
  capRate: number | null;
  askingPrice: number | null;
  calculationMethod: 'capRate' | 'askingPrice';
}

/**
 * Complete SubModule data format for other_branch income module
 * This is the target format for integration
 */
export interface OtherBranchSubModuleData {
  revenueStreams: OtherBranchRevenueStream[];
  expenseRows: OtherBranchExpenseRow[];
  valuationData?: OtherBranchValuationData;
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert CustomFinancialModelOutput to other_branch SubModuleData format
 *
 * @param output - The custom model output from PARSE-N-FILL
 * @param options - Conversion options
 * @returns Data in other_branch format ready for integration
 *
 * @example
 * ```typescript
 * const parsedData = await parseDocument(file);
 * const subModuleData = toOtherBranchFormat(parsedData);
 *
 * // In other_branch, use to populate income module
 * store.setSubModuleData(subModuleId, subModuleData);
 * ```
 */
export function toOtherBranchFormat(
  output: CustomFinancialModelOutput,
  options: {
    /** Stream name for imported revenue */
    streamName?: string;
    /** Category for the revenue stream */
    streamCategory?: 'Residential' | 'Commercial' | 'Miscellaneous';
    /** Default vacancy rate if not specified */
    defaultVacancyRate?: number;
  } = {}
): OtherBranchSubModuleData {
  const {
    streamName = 'Imported Revenue',
    streamCategory = 'Miscellaneous',
    defaultVacancyRate = 5,
  } = options;

  const { userInput } = output.customModel;

  // Convert revenue items to revenue rows
  const revenueRows: OtherBranchRevenueRow[] = userInput.revenueItems.map((item, index) => ({
    id: item.id || `imported-rev-${index}`,
    unit: item.label,
    squareFeet: null,
    monthlyRate: item.amount / 12,
    annualIncome: item.amount,
    effectiveAnnualIncome: item.amount, // Will be adjusted by stream vacancy rate
    isVacant: false,
    operatingVacancyAndCreditLoss: 0,
    tenantName: item.notes,
  }));

  // Get vacancy rate from user input or default
  const vacancyRate =
    userInput.valuationInputs?.vacancyRate?.value != null
      ? userInput.valuationInputs.vacancyRate.value * 100 // Convert decimal to percentage
      : defaultVacancyRate;

  // Calculate totals
  const grossRevenue = revenueRows.reduce((sum, row) => sum + (row.annualIncome || 0), 0);
  const effectiveRevenue = grossRevenue * (1 - vacancyRate / 100);

  // Create revenue stream
  const revenueStream: OtherBranchRevenueStream = {
    id: 'imported-stream',
    name: streamName,
    category: streamCategory,
    rows: revenueRows,
    vacancyRate,
    totals: {
      grossRevenue,
      effectiveRevenue,
      squareFootage: 0, // Not available from custom model
    },
  };

  // Convert expense items to expense rows
  const expenseRows: OtherBranchExpenseRow[] = userInput.expenseItems.map((item, index) => ({
    id: item.id || `imported-exp-${index}`,
    name: item.label,
    amount: item.amount,
    calculationMethod: 'direct',
    lastModifiedMethod: 'direct',
    dataSource: item.source.sourceType === 'parsed_document' ? 'Imported from document' : 'User input',
  }));

  // Build valuation data
  const valuationData: OtherBranchValuationData | undefined =
    userInput.valuationInputs?.capRate?.value != null ||
    userInput.valuationInputs?.askingPrice?.value != null
      ? {
          capRate: userInput.valuationInputs.capRate?.value ?? null,
          askingPrice: userInput.valuationInputs.askingPrice?.value ?? null,
          calculationMethod: userInput.valuationInputs.capRate?.value != null ? 'capRate' : 'askingPrice',
        }
      : undefined;

  return {
    revenueStreams: [revenueStream],
    expenseRows,
    valuationData,
  };
}

/**
 * Convert line items to categorized revenue streams
 *
 * Groups revenue items by category into separate streams
 *
 * @param items - Revenue line items
 * @returns Multiple revenue streams organized by category
 */
export function toGroupedRevenueStreams(
  items: LineItemWithSource[]
): OtherBranchRevenueStream[] {
  // Group items by category
  const grouped = new Map<string, LineItemWithSource[]>();

  for (const item of items) {
    const category = item.category || 'Miscellaneous';
    const existing = grouped.get(category) || [];
    existing.push(item);
    grouped.set(category, existing);
  }

  // Convert each group to a revenue stream
  const streams: OtherBranchRevenueStream[] = [];

  for (const [category, categoryItems] of grouped) {
    const rows: OtherBranchRevenueRow[] = categoryItems.map((item, index) => ({
      id: item.id || `${category.toLowerCase()}-${index}`,
      unit: item.label,
      squareFeet: null,
      monthlyRate: item.amount / 12,
      annualIncome: item.amount,
      effectiveAnnualIncome: item.amount,
      isVacant: false,
      operatingVacancyAndCreditLoss: 0,
    }));

    const grossRevenue = rows.reduce((sum, row) => sum + (row.annualIncome || 0), 0);

    // Determine stream category based on keywords
    let streamCategory: 'Residential' | 'Commercial' | 'Miscellaneous' = 'Miscellaneous';
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('residential') || categoryLower.includes('apartment')) {
      streamCategory = 'Residential';
    } else if (
      categoryLower.includes('commercial') ||
      categoryLower.includes('office') ||
      categoryLower.includes('retail')
    ) {
      streamCategory = 'Commercial';
    }

    streams.push({
      id: `stream-${category.toLowerCase().replace(/\s+/g, '-')}`,
      name: category,
      category: streamCategory,
      rows,
      totals: {
        grossRevenue,
        effectiveRevenue: grossRevenue, // No vacancy applied at stream level
        squareFootage: 0,
      },
    });
  }

  return streams;
}

/**
 * Extract calculation results in a format suitable for display
 *
 * @param output - The custom model output
 * @returns Flat object with calculated values for easy access
 */
export function extractCalculationResults(
  output: CustomFinancialModelOutput
): Record<string, number | null> {
  const { calculations } = output.customModel;
  const results: Record<string, number | null> = {};

  // Revenue calculations
  if (calculations.revenue) {
    results.grossPotentialIncome = calculations.revenue.grossPotentialIncome?.value ?? null;
    results.effectiveGrossIncome = calculations.revenue.effectiveGrossIncome?.value ?? null;
    results.vacancyLoss = calculations.revenue.vacancyLoss?.value ?? null;
  }

  // Expense calculations
  if (calculations.expenses) {
    results.totalOperatingExpenses = calculations.expenses.totalOperatingExpenses?.value ?? null;
    results.expenseRatio = calculations.expenses.expenseRatio?.value ?? null;
    results.expensePerSqFt = calculations.expenses.expensePerSqFt?.value ?? null;
  }

  // Income calculations
  if (calculations.income) {
    results.netOperatingIncome = calculations.income.netOperatingIncome?.value ?? null;
    results.noiMargin = calculations.income.noiMargin?.value ?? null;
    results.noiPerSqFt = calculations.income.noiPerSqFt?.value ?? null;
  }

  // Valuation calculations
  if (calculations.valuation) {
    results.propertyValue = calculations.valuation.propertyValue?.value ?? null;
    results.pricePerSqFt = calculations.valuation.pricePerSqFt?.value ?? null;
    results.grossRentMultiplier = calculations.valuation.grossRentMultiplier?.value ?? null;
    results.capRate = calculations.valuation.capRate?.value ?? null;
  }

  return results;
}

/**
 * Convert to DirectCapitalizationRateModel format (legacy PARSE-N-FILL format)
 *
 * @param output - The custom model output
 * @returns Legacy DirectCapitalizationRateModel format
 */
export function toDirectCapitalizationRateModel(
  output: CustomFinancialModelOutput
): {
  timeStamp: string;
  agentReasoning: string;
  annualOperatingRevenue: Record<string, number>;
  annualOperatingExpenses: Record<string, number>;
  oneTimeAdjustment: Record<string, number>;
} {
  const { userInput } = output.customModel;

  // Convert revenue items to record
  const annualOperatingRevenue: Record<string, number> = {};
  for (const item of userInput.revenueItems) {
    annualOperatingRevenue[item.label] = item.amount;
  }

  // Convert expense items to record
  const annualOperatingExpenses: Record<string, number> = {};
  for (const item of userInput.expenseItems) {
    annualOperatingExpenses[item.label] = item.amount;
  }

  // Convert adjustment items to record
  const oneTimeAdjustment: Record<string, number> = {};
  for (const item of userInput.adjustmentItems || []) {
    oneTimeAdjustment[item.label] = item.amount;
  }

  return {
    timeStamp: output.metadata.createdAt,
    agentReasoning: output.briefReasoning.summary,
    annualOperatingRevenue,
    annualOperatingExpenses,
    oneTimeAdjustment,
  };
}
