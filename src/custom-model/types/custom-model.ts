/**
 * Custom Financial Model Types
 *
 * The core data structures for the Custom Financial Model system.
 * This architecture separates:
 * - userInput: Values from user or parsed documents
 * - calculations: Auditable formulas and results
 * - types: Metadata for formatting and source attribution
 *
 * @example
 * ```typescript
 * const model: CustomFinancialModelOutput = {
 *   id: "model-123",
 *   title: "123 Main St - Direct Cap",
 *   briefReasoning: { summary: "...", decisions: [], flaggedItems: [], overallConfidence: 0.92 },
 *   customModel: {
 *     userInput: { revenueItems: [...], expenseItems: [...] },
 *     calculations: { netOperatingIncome: {...}, propertyValue: {...} },
 *     types: { "userInput.revenueItems[0].amount": { type: "currency", currency: "USD" } }
 *   },
 *   metadata: { ... }
 * }
 * ```
 */

import type {
  SourceReference,
  Footnote,
  DocumentLocation,
  NumberWithSource,
} from './source-reference';
import type { CalculationResult } from './calculation-result';

// =============================================================================
// USER INPUT SECTION
// =============================================================================

/**
 * Line item with full source tracking
 * Used for revenue, expense, and adjustment items
 */
export interface LineItemWithSource {
  /** Unique identifier */
  id: string;

  /** Display label (e.g., "Base Rent", "Property Tax") */
  label: string;

  /** Dollar amount */
  amount: number;

  /** Source reference for audit trail */
  source: SourceReference;

  /** Category hint from extraction */
  category?: string;

  /** Additional notes or context */
  notes?: string;

  /** Whether this item was flagged for review */
  flaggedForReview?: boolean;
}

/**
 * Valuation inputs provided by user or extracted
 */
export interface ValuationInputs {
  /** Capitalization rate (as decimal, e.g., 0.065 for 6.5%) */
  capRate?: NumberWithSource;

  /** Asking price if known */
  askingPrice?: NumberWithSource;

  /** Vacancy rate (as decimal, e.g., 0.05 for 5%) */
  vacancyRate?: NumberWithSource;

  /** Additional valuation-related inputs */
  [key: string]: NumberWithSource | undefined;
}

/**
 * Property information inputs
 */
export interface PropertyInfo {
  /** Total square footage */
  squareFootage?: NumberWithSource;

  /** Number of units */
  units?: NumberWithSource;

  /** Year built */
  yearBuilt?: NumberWithSource;

  /** Lot size (acres or sq ft) */
  lotSize?: NumberWithSource;

  /** Dynamic additional fields */
  [key: string]: NumberWithSource | { value: string; source: SourceReference } | undefined;
}

/**
 * User Input Section
 * Contains all values obtained from user entry or document parsing
 */
export interface UserInputSection {
  /** Revenue line items from document/user */
  revenueItems: LineItemWithSource[];

  /** Expense line items */
  expenseItems: LineItemWithSource[];

  /** One-time adjustments (reserves, deferred maintenance, etc.) */
  adjustmentItems?: LineItemWithSource[];

  /** Property-level information */
  propertyInfo?: PropertyInfo;

  /** Valuation inputs */
  valuationInputs?: ValuationInputs;
}

// =============================================================================
// CALCULATIONS SECTION
// =============================================================================

/**
 * Revenue-related calculations
 */
export interface RevenueCalculations {
  /** Sum of all revenue items */
  grossPotentialIncome: CalculationResult;

  /** GPI minus vacancy allowance */
  effectiveGrossIncome: CalculationResult;

  /** Vacancy loss amount */
  vacancyLoss?: CalculationResult;
}

/**
 * Expense-related calculations
 */
export interface ExpenseCalculations {
  /** Sum of all expense items */
  totalOperatingExpenses: CalculationResult;

  /** Expenses as % of EGI */
  expenseRatio?: CalculationResult;

  /** Expenses per square foot */
  expensePerSqFt?: CalculationResult;
}

/**
 * Income-related calculations
 */
export interface IncomeCalculations {
  /** EGI minus total expenses */
  netOperatingIncome: CalculationResult;

  /** NOI as % of EGI */
  noiMargin?: CalculationResult;

  /** NOI per square foot */
  noiPerSqFt?: CalculationResult;
}

/**
 * Valuation-related calculations
 */
export interface ValuationCalculations {
  /** NOI / cap rate = property value */
  propertyValue?: CalculationResult;

  /** Property value / square footage */
  pricePerSqFt?: CalculationResult;

  /** Property value / gross revenue */
  grossRentMultiplier?: CalculationResult;

  /** Cap rate (derived or input) */
  capRate?: CalculationResult;
}

/**
 * Calculations Section
 * Contains all computed/derived values with formulas and audit trail
 */
export interface CalculationsSection {
  /** Revenue calculations */
  revenue: RevenueCalculations;

  /** Expense calculations */
  expenses: ExpenseCalculations;

  /** Income calculations */
  income: IncomeCalculations;

  /** Valuation calculations (if cap rate or asking price provided) */
  valuation?: ValuationCalculations;

  /** Custom calculations defined by specific model template */
  custom?: Record<string, CalculationResult>;
}

// =============================================================================
// TYPES SECTION
// =============================================================================

/**
 * Data type for a field
 */
export type FieldValueType =
  | 'currency'
  | 'percentage'
  | 'number'
  | 'date'
  | 'text'
  | 'boolean';

/**
 * Type metadata for a single field
 */
export interface TypeMetadata {
  /** Data type */
  type: FieldValueType;

  /** Currency code for currency type (ISO 4217) */
  currency?: string;

  /** Date format for date type (e.g., "YYYY-MM-DD") */
  dateFormat?: string;

  /** Decimal precision */
  precision?: number;

  /** Unit of measure for non-currency numbers */
  unit?: string;

  /** Footnotes attached to this field */
  footnotes?: Footnote[];

  /** Document location if from parsed source */
  sourceLocation?: DocumentLocation;

  /** Whether this value was manually overridden */
  isOverridden?: boolean;

  /** Original value before override (for audit) */
  originalValue?: number | string | null;

  /** Display format string (e.g., "$0,0.00") */
  displayFormat?: string;

  /** Constraints for validation */
  constraints?: {
    min?: number;
    max?: number;
    required?: boolean;
  };
}

/**
 * Types Section
 * Maps field paths to type metadata for formatting and validation
 *
 * @example
 * ```typescript
 * const types: TypesSection = {
 *   "userInput.revenueItems[0].amount": { type: "currency", currency: "USD", precision: 2 },
 *   "userInput.valuationInputs.capRate": { type: "percentage", precision: 2 },
 *   "calculations.income.netOperatingIncome": { type: "currency", currency: "USD", precision: 0 }
 * }
 * ```
 */
export interface TypesSection {
  [fieldPath: string]: TypeMetadata;
}

// =============================================================================
// BRIEF REASONING
// =============================================================================

/**
 * A key decision made during extraction/calculation
 */
export interface ReasoningDecision {
  /** What was decided */
  decision: string;

  /** Why this decision was made */
  rationale: string;

  /** Fields affected by this decision */
  affectedFields: string[];

  /** Confidence in this decision (0-1) */
  confidence: number;

  /** Alternative interpretations considered */
  alternatives?: string[];
}

/**
 * An item flagged for human review (Ramp selective escalation pattern)
 */
export interface FlaggedItem {
  /** Field path in customModel */
  field: string;

  /** Reason for flagging */
  reason: string;

  /** Severity level */
  severity: 'info' | 'warning' | 'error';

  /** Suggested action for reviewer */
  suggestedAction?: string;

  /** Confidence score that triggered flag */
  confidence?: number;
}

/**
 * Brief Reasoning
 * Agent's explanation of extraction and calculation decisions
 *
 * The summary field uses source notation format:
 * `${valueKey, tooltip:sourceType-refType:refValue}`
 *
 * @example
 * ```typescript
 * const reasoning: BriefReasoning = {
 *   summary: "Extracted ${revenueCount, tooltip:userInput-key:revenueItems} revenue items totaling ${totalRevenue, tooltip:calculated-key:grossPotentialIncome}.",
 *   decisions: [{
 *     decision: "Classified 'CAM Recoveries' as revenue",
 *     rationale: "Document indicates tenant reimbursement",
 *     affectedFields: ["userInput.revenueItems[2]"],
 *     confidence: 0.95
 *   }],
 *   flaggedItems: [],
 *   overallConfidence: 0.92
 * }
 * ```
 */
export interface BriefReasoning {
  /** Narrative summary with embedded source references */
  summary: string;

  /** Key decisions made during processing */
  decisions: ReasoningDecision[];

  /** Items flagged for human review */
  flaggedItems: FlaggedItem[];

  /** Overall confidence score (0-1) */
  overallConfidence: number;
}

// =============================================================================
// METADATA
// =============================================================================

/**
 * Processing and provenance metadata
 */
export interface ModelMetadata {
  /** Source document filename */
  sourceFileName?: string;

  /** Source document MIME type */
  sourceFileType?: string;

  /** Processing time in milliseconds */
  processingTimeMs?: number;

  /** Model template version */
  modelVersion: string;

  /** AI model used for extraction */
  agentModel?: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp */
  updatedAt?: string;

  /** Parsing session ID for traceability */
  parsingSessionId?: string;
}

// =============================================================================
// CUSTOM FINANCIAL MODEL OUTPUT
// =============================================================================

/**
 * Financial model type discriminator
 */
export type FinancialModelType =
  | 'direct_capitalization'
  | 'discounted_cash_flow'
  | 'sales_comparison'
  | 'cost_approach'
  | 'development_residual'
  | 'custom';

/**
 * Custom Financial Model Output
 *
 * The complete output from the financial model extraction agent.
 * Contains all extracted data, calculations, and reasoning for audit.
 *
 * @example
 * ```typescript
 * const output: CustomFinancialModelOutput = {
 *   id: "model-550e8400-e29b-41d4-a716-446655440000",
 *   title: "123 Main Street - Direct Cap Analysis",
 *   modelType: "direct_capitalization",
 *   briefReasoning: {
 *     summary: "Extracted 5 revenue items...",
 *     decisions: [...],
 *     flaggedItems: [],
 *     overallConfidence: 0.92
 *   },
 *   customModel: {
 *     userInput: { revenueItems: [...], expenseItems: [...] },
 *     calculations: { revenue: {...}, expenses: {...}, income: {...} },
 *     types: { ... }
 *   },
 *   metadata: {
 *     modelVersion: "1.0.0",
 *     createdAt: "2025-12-13T10:30:00.000Z",
 *     agentModel: "claude-sonnet-4-20250514"
 *   }
 * }
 * ```
 */
export interface CustomFinancialModelOutput {
  /** Unique identifier for this model instance */
  id: string;

  /** User-friendly title */
  title: string;

  /** Type of financial model */
  modelType: FinancialModelType;

  /** Agent's reasoning with source notation */
  briefReasoning: BriefReasoning;

  /** The extracted and calculated model data */
  customModel: {
    /** User inputs and extracted values */
    userInput: UserInputSection;

    /** Calculated values with formulas */
    calculations: CalculationsSection;

    /** Type metadata for all fields */
    types: TypesSection;
  };

  /** Processing metadata */
  metadata: ModelMetadata;
}

// =============================================================================
// DIRECT CAPITALIZATION SPECIFIC TYPES
// =============================================================================

/**
 * Direct Capitalization Model user inputs
 * Specialized interface for the Direct Cap template
 */
export interface DirectCapUserInput extends UserInputSection {
  valuationInputs: ValuationInputs & {
    capRate: NumberWithSource;
  };
}

/**
 * Direct Capitalization Model calculations
 */
export interface DirectCapCalculations extends CalculationsSection {
  valuation: ValuationCalculations & {
    propertyValue: CalculationResult;
  };
}

/**
 * Direct Capitalization Model
 * Specialized output for the Direct Cap template
 */
export interface DirectCapitalizationModelOutput extends CustomFinancialModelOutput {
  modelType: 'direct_capitalization';
  customModel: {
    userInput: DirectCapUserInput;
    calculations: DirectCapCalculations;
    types: TypesSection;
  };
}
