/**
 * Direct Capitalization Rate Model
 *
 * Core output structure for financial document parsing.
 * Used in commercial real estate valuation.
 */

/**
 * The main output model for parsed financial documents
 */
export interface DirectCapitalizationRateModel {
  /**
   * ISO 8601 timestamp of when extraction occurred
   * @example "2025-12-12T10:30:00.000Z"
   */
  timeStamp: string;

  /**
   * Agent's reasoning and explanation for audit trail
   * Describes why items were categorized the way they were
   * @example "Extracted 5 revenue items from rent roll..."
   */
  agentReasoning: string;

  /**
   * Annual operating revenue line items
   * Key: Item name, Value: Annual dollar amount
   * @example { "Rental Income": 120000, "Parking Fees": 5000 }
   */
  annualOperatingRevenue: Record<string, number>;

  /**
   * Annual operating expenses line items
   * Key: Item name, Value: Annual dollar amount
   * @example { "Property Tax": 15000, "Insurance": 8000 }
   */
  annualOperatingExpenses: Record<string, number>;

  /**
   * One-time adjustments (positive or negative)
   * Key: Item name, Value: Dollar amount (negative for deductions)
   * @example { "Deferred Maintenance": -5000, "Capital Reserve": -3000 }
   */
  oneTimeAdjustment: Record<string, number>;
}

/**
 * Calculated metrics derived from the DirectCapitalizationRateModel
 */
export interface DirectCapCalculations {
  /** Sum of all revenue items */
  grossPotentialIncome: number;

  /** Gross potential income minus vacancy allowance (if any) */
  effectiveGrossIncome: number;

  /** Sum of all expense items */
  totalOperatingExpenses: number;

  /** Effective gross income minus total operating expenses */
  netOperatingIncome: number;

  /** Sum of all adjustment items */
  totalAdjustments: number;

  /** NOI plus/minus adjustments, or null if cap rate not provided */
  adjustedValue: number | null;
}

/**
 * Complete result from document parsing
 */
export interface DirectCapResult {
  /** The extracted financial model */
  model: DirectCapitalizationRateModel;

  /** Calculated metrics */
  calculations: DirectCapCalculations;

  /** Processing metadata */
  metadata: {
    /** Original filename */
    sourceFileName: string;

    /** MIME type of source file */
    sourceFileType: string;

    /** Processing time in milliseconds */
    processingTimeMs: number;

    /** Confidence score from 0-1 */
    confidence: number;
  };
}
