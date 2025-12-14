/**
 * Direct Capitalization Rate Model Formula Definitions
 *
 * This file defines the formulas for the Direct Capitalization approach
 * to commercial real estate valuation.
 *
 * Core formulas:
 * - Gross Potential Income = Sum of all revenue items
 * - Effective Gross Income = GPI - Vacancy Allowance
 * - Net Operating Income = EGI - Total Operating Expenses
 * - Property Value = NOI / Cap Rate
 *
 * Each formula is defined declaratively with:
 * - Human-readable display formula
 * - Machine-executable expression
 * - Dependencies for execution order
 * - Validation rules
 */

import type { FormulaDefinition, ValidationResult } from '../types';

/**
 * Helper to create a validation result
 */
function validResult(): ValidationResult {
  return { isValid: true, severity: 'info' };
}

function warningResult(message: string): ValidationResult {
  return { isValid: true, message, severity: 'warning' };
}

function errorResult(message: string): ValidationResult {
  return { isValid: false, message, severity: 'error' };
}

/**
 * Direct Capitalization Rate Model Formulas
 *
 * Execution order is determined by dependencies:
 * 1. grossPotentialIncome (no deps)
 * 2. totalOperatingExpenses (no deps)
 * 3. vacancyAllowance (depends on GPI)
 * 4. effectiveGrossIncome (depends on GPI, vacancy)
 * 5. netOperatingIncome (depends on EGI, expenses)
 * 6. expenseRatio (depends on expenses, EGI)
 * 7. propertyValue (depends on NOI)
 * 8. pricePerSqFt (depends on value)
 * 9. grossRentMultiplier (depends on value, GPI)
 */
export const directCapFormulas: FormulaDefinition[] = [
  // ==========================================================================
  // REVENUE CALCULATIONS
  // ==========================================================================
  {
    id: 'grossPotentialIncome',
    name: 'Gross Potential Income',
    humanReadable: 'Sum of all Revenue Items',
    expression: 'SUM(userInput.revenueItems.amount)',
    operands: [
      {
        ref: 'userInput.revenueItems',
        label: 'Revenue Items',
        description: 'All revenue line items from rent roll and other income',
      },
    ],
    dependencies: [],
    compute: (inputs) => inputs.totalRevenue ?? null,
    outputFormat: 'currency',
    category: 'revenue',
    description: 'Total potential income if property was 100% occupied at market rates',
  },

  {
    id: 'vacancyAllowance',
    name: 'Vacancy Allowance',
    humanReadable: 'Gross Potential Income × Vacancy Rate',
    expression: 'grossPotentialIncome * vacancyRate',
    operands: [
      {
        ref: 'calculations.grossPotentialIncome',
        label: 'Gross Potential Income',
      },
      {
        ref: 'userInput.valuationInputs.vacancyRate',
        label: 'Vacancy Rate',
        description: 'Expected vacancy as decimal (e.g., 0.05 for 5%)',
      },
    ],
    dependencies: ['grossPotentialIncome'],
    compute: (inputs) => {
      const gpi = inputs.grossPotentialIncome;
      const rate = inputs.vacancyRate ?? 0.05; // Default 5%
      if (gpi == null) return null;
      return gpi * rate;
    },
    outputFormat: 'currency',
    category: 'revenue',
    description: 'Estimated income loss due to vacancy and credit loss',
  },

  {
    id: 'effectiveGrossIncome',
    name: 'Effective Gross Income',
    humanReadable: 'Gross Potential Income - Vacancy Allowance',
    expression: 'grossPotentialIncome - vacancyAllowance',
    operands: [
      {
        ref: 'calculations.grossPotentialIncome',
        label: 'GPI',
      },
      {
        ref: 'calculations.vacancyAllowance',
        label: 'Vacancy Allowance',
      },
    ],
    dependencies: ['grossPotentialIncome', 'vacancyAllowance'],
    compute: (inputs) => {
      const gpi = inputs.grossPotentialIncome;
      const vacancy = inputs.vacancyAllowance ?? 0;
      if (gpi == null) return null;
      return gpi - vacancy;
    },
    outputFormat: 'currency',
    category: 'revenue',
    description: 'Actual expected income after accounting for vacancy',
  },

  // ==========================================================================
  // EXPENSE CALCULATIONS
  // ==========================================================================
  {
    id: 'totalOperatingExpenses',
    name: 'Total Operating Expenses',
    humanReadable: 'Sum of all Expense Items',
    expression: 'SUM(userInput.expenseItems.amount)',
    operands: [
      {
        ref: 'userInput.expenseItems',
        label: 'Expense Items',
        description: 'All operating expense line items',
      },
    ],
    dependencies: [],
    compute: (inputs) => inputs.totalExpenses ?? null,
    outputFormat: 'currency',
    category: 'expenses',
    description: 'Total annual operating expenses for the property',
  },

  {
    id: 'expenseRatio',
    name: 'Expense Ratio',
    humanReadable: 'Total Operating Expenses / Effective Gross Income × 100',
    expression: '(totalOperatingExpenses / effectiveGrossIncome) * 100',
    operands: [
      {
        ref: 'calculations.totalOperatingExpenses',
        label: 'Total Expenses',
      },
      {
        ref: 'calculations.effectiveGrossIncome',
        label: 'EGI',
      },
    ],
    dependencies: ['totalOperatingExpenses', 'effectiveGrossIncome'],
    compute: (inputs) => {
      const expenses = inputs.totalOperatingExpenses;
      const egi = inputs.effectiveGrossIncome;
      if (expenses == null || egi == null || egi <= 0) return null;
      return (expenses / egi) * 100;
    },
    outputFormat: 'percentage',
    category: 'expenses',
    description: 'Operating expenses as a percentage of effective gross income',
    validate: (result) => {
      if (result !== null && result > 70) {
        return warningResult('Expense ratio above 70% may indicate inefficient operations');
      }
      if (result !== null && result > 100) {
        return errorResult('Expense ratio over 100% - expenses exceed income');
      }
      return validResult();
    },
  },

  // ==========================================================================
  // INCOME CALCULATIONS
  // ==========================================================================
  {
    id: 'netOperatingIncome',
    name: 'Net Operating Income',
    humanReadable: 'Effective Gross Income - Total Operating Expenses',
    expression: 'effectiveGrossIncome - totalOperatingExpenses',
    operands: [
      {
        ref: 'calculations.effectiveGrossIncome',
        label: 'Effective Gross Income',
      },
      {
        ref: 'calculations.totalOperatingExpenses',
        label: 'Total Operating Expenses',
      },
    ],
    dependencies: ['effectiveGrossIncome', 'totalOperatingExpenses'],
    compute: (inputs) => {
      const egi = inputs.effectiveGrossIncome;
      const expenses = inputs.totalOperatingExpenses ?? 0;
      if (egi == null) return null;
      return egi - expenses;
    },
    outputFormat: 'currency',
    category: 'income',
    description:
      'Income remaining after operating expenses, before debt service and income taxes',
    validate: (result) => {
      if (result !== null && result < 0) {
        return warningResult('NOI is negative - expenses exceed income');
      }
      return validResult();
    },
  },

  {
    id: 'noiMargin',
    name: 'NOI Margin',
    humanReadable: 'Net Operating Income / Effective Gross Income × 100',
    expression: '(netOperatingIncome / effectiveGrossIncome) * 100',
    operands: [
      {
        ref: 'calculations.netOperatingIncome',
        label: 'NOI',
      },
      {
        ref: 'calculations.effectiveGrossIncome',
        label: 'EGI',
      },
    ],
    dependencies: ['netOperatingIncome', 'effectiveGrossIncome'],
    compute: (inputs) => {
      const noi = inputs.netOperatingIncome;
      const egi = inputs.effectiveGrossIncome;
      if (noi == null || egi == null || egi <= 0) return null;
      return (noi / egi) * 100;
    },
    outputFormat: 'percentage',
    category: 'income',
    description: 'NOI as a percentage of effective gross income',
  },

  // ==========================================================================
  // VALUATION CALCULATIONS
  // ==========================================================================
  {
    id: 'propertyValue',
    name: 'Property Value',
    humanReadable: 'Net Operating Income / Cap Rate',
    expression: 'netOperatingIncome / capRate',
    operands: [
      {
        ref: 'calculations.netOperatingIncome',
        label: 'Net Operating Income',
      },
      {
        ref: 'userInput.valuationInputs.capRate',
        label: 'Capitalization Rate',
        description: 'Market cap rate as decimal (e.g., 0.065 for 6.5%)',
      },
    ],
    dependencies: ['netOperatingIncome'],
    compute: (inputs) => {
      const noi = inputs.netOperatingIncome;
      const capRate = inputs.capRate;
      if (noi == null || capRate == null || capRate <= 0) return null;
      return noi / capRate;
    },
    outputFormat: 'currency',
    category: 'valuation',
    description: 'Indicated property value using income capitalization approach',
    validate: (result) => {
      if (result !== null && result < 0) {
        return errorResult('Property value cannot be negative');
      }
      return validResult();
    },
  },

  {
    id: 'pricePerSqFt',
    name: 'Price per Square Foot',
    humanReadable: 'Property Value / Total Square Feet',
    expression: 'propertyValue / squareFootage',
    operands: [
      {
        ref: 'calculations.propertyValue',
        label: 'Property Value',
      },
      {
        ref: 'userInput.propertyInfo.squareFootage',
        label: 'Square Footage',
      },
    ],
    dependencies: ['propertyValue'],
    compute: (inputs) => {
      const value = inputs.propertyValue;
      const sqft = inputs.squareFootage;
      if (value == null || sqft == null || sqft <= 0) return null;
      return value / sqft;
    },
    outputFormat: 'currency',
    category: 'valuation',
    description: 'Property value per square foot',
  },

  {
    id: 'grossRentMultiplier',
    name: 'Gross Rent Multiplier',
    humanReadable: 'Property Value / Gross Potential Income',
    expression: 'propertyValue / grossPotentialIncome',
    operands: [
      {
        ref: 'calculations.propertyValue',
        label: 'Property Value',
      },
      {
        ref: 'calculations.grossPotentialIncome',
        label: 'Gross Potential Income',
      },
    ],
    dependencies: ['propertyValue', 'grossPotentialIncome'],
    compute: (inputs) => {
      const value = inputs.propertyValue;
      const gpi = inputs.grossPotentialIncome;
      if (value == null || gpi == null || gpi <= 0) return null;
      return value / gpi;
    },
    outputFormat: 'ratio',
    category: 'valuation',
    description: 'Ratio of property value to gross income (quick valuation metric)',
    validate: (result) => {
      if (result !== null && (result < 1 || result > 30)) {
        return warningResult('GRM outside typical range of 1-30x');
      }
      return validResult();
    },
  },
];

/**
 * Get all Direct Cap formulas
 */
export function getDirectCapFormulas(): FormulaDefinition[] {
  return directCapFormulas;
}

/**
 * Get a specific formula by ID
 */
export function getFormulaById(id: string): FormulaDefinition | undefined {
  return directCapFormulas.find((f) => f.id === id);
}

/**
 * Get formulas by category
 */
export function getFormulasByCategory(
  category: 'revenue' | 'expenses' | 'income' | 'valuation'
): FormulaDefinition[] {
  return directCapFormulas.filter((f) => f.category === category);
}
