/**
 * Calculation Result Types
 *
 * These types define how calculations are represented in a way that is
 * both human-readable (for audit/documentation) and machine-executable.
 *
 * Pattern follows Causal's "human-readable formulas" approach where
 * formulas are defined declaratively with display strings AND executable functions.
 */

import type { SourceReference, Footnote } from './source-reference';

/**
 * Output format for calculated values
 */
export type OutputFormat = 'currency' | 'percentage' | 'number' | 'ratio';

/**
 * Reference to an operand used in a calculation
 */
export interface OperandRef {
  /** Path to the value (e.g., "userInput.revenueItems[0]", "calculations.noi") */
  ref: string;

  /** Human-readable label for display */
  label: string;

  /** Optional description for tooltips */
  description?: string;

  /** Optional coefficient/multiplier applied to this operand */
  coefficient?: number;
}

/**
 * Formula definition for a calculation
 * Contains both human-readable and machine-executable representations
 */
export interface CalculationFormula {
  /** Human-readable formula (e.g., "NOI = EGI - Total Expenses") */
  displayFormula: string;

  /** Machine-parseable expression (e.g., "effectiveGrossIncome - totalOperatingExpenses") */
  expression: string;

  /** References to operands used in this calculation */
  operands: OperandRef[];

  /** Operator for simple binary operations */
  operator?: 'add' | 'subtract' | 'multiply' | 'divide' | 'sum' | 'custom';

  /** For complex calculations, name of predefined function */
  calculationFn?: string;
}

/**
 * Single step in a multi-step calculation
 * Used for audit trail showing intermediate values
 */
export interface CalculationStep {
  /** Description of this step */
  description: string;

  /** Expression evaluated in this step */
  expression: string;

  /** Result of this step (null if computation failed) */
  result: number | null;

  /** Order in calculation sequence */
  order?: number;
}

/**
 * Validation result for a calculation
 */
export interface ValidationResult {
  /** Whether the result is valid */
  isValid: boolean;

  /** Validation message (for warnings or errors) */
  message?: string;

  /** Severity of validation issue */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Complete result of a calculation with full audit trail
 *
 * Example:
 * ```typescript
 * const noiResult: CalculationResult = {
 *   value: 156000,
 *   formula: {
 *     displayFormula: "Net Operating Income = EGI - Total Expenses",
 *     expression: "effectiveGrossIncome - totalOperatingExpenses",
 *     operands: [
 *       { ref: "calculations.effectiveGrossIncome", label: "EGI" },
 *       { ref: "calculations.totalOperatingExpenses", label: "Total Expenses" }
 *     ],
 *     operator: "subtract"
 *   },
 *   steps: [
 *     { description: "Get EGI", expression: "228000", result: 228000 },
 *     { description: "Get Expenses", expression: "72000", result: 72000 },
 *     { description: "Calculate NOI", expression: "228000 - 72000", result: 156000 }
 *   ],
 *   isValid: true,
 *   source: {
 *     sourceType: "calculated",
 *     reference: { key: "netOperatingIncome" },
 *     displayPath: "calculations.netOperatingIncome",
 *     timestamp: "2025-12-13T10:45:00.000Z"
 *   }
 * }
 * ```
 */
export interface CalculationResult {
  /** The computed value (null if computation failed or inputs missing) */
  value: number | null;

  /** Formula definition with human-readable + machine expression */
  formula: CalculationFormula;

  /** Intermediate calculation steps (for audit trail) */
  steps?: CalculationStep[];

  /** Whether the calculation succeeded */
  isValid: boolean;

  /** Error message if calculation failed */
  error?: string;

  /** Warning message if value may be questionable */
  warning?: string;

  /** Source reference for audit trail */
  source: SourceReference;

  /** Output format for display */
  outputFormat?: OutputFormat;

  /** Currency code if outputFormat is 'currency' */
  currency?: string;

  /** Decimal precision */
  precision?: number;

  /** Footnotes explaining calculation */
  footnotes?: Footnote[];
}

/**
 * Formula definition for the calculation engine
 * Defines how a calculation works declaratively
 */
export interface FormulaDefinition {
  /** Unique identifier for this formula */
  id: string;

  /** Human-readable name */
  name: string;

  /** Human-readable formula expression */
  humanReadable: string;

  /** Machine-parseable expression */
  expression: string;

  /** Operand references */
  operands: OperandRef[];

  /** IDs of formulas that must be calculated first */
  dependencies: string[];

  /** The actual computation function */
  compute: (inputs: Record<string, number | null>) => number | null;

  /** Output format for display */
  outputFormat: OutputFormat;

  /** Optional validation function */
  validate?: (result: number | null) => ValidationResult;

  /** Description of what this formula calculates */
  description?: string;

  /** Category for grouping (e.g., "revenue", "expenses", "valuation") */
  category?: string;
}

/**
 * Complete audit trail for a model's calculations
 */
export interface CalculationAuditTrail {
  /** Model identifier */
  modelId: string;

  /** Timestamp of calculation */
  timestamp: string;

  /** All calculation results in execution order */
  calculations: CalculationResult[];

  /** Final computed values by formula ID */
  results: Record<string, number | null>;

  /** Any warnings generated during calculation */
  warnings: string[];

  /** Processing time in milliseconds */
  processingTimeMs?: number;
}
