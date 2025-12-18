/**
 * Revenue Stream Types
 *
 * Core types for rent roll extraction, compatible with other_branch integration.
 * Minimal interface based on UI columns: Vac, Unit, Sq Ft, Monthly, Annual
 */

/**
 * Revenue stream category for grouping
 */
export type RevenueStreamCategory =
  | "Residential"
  | "Commercial"
  | "Miscellaneous";

/**
 * Individual revenue row (unit-level data)
 */
export interface RevenueRow {
  /** Unique row identifier */
  id: string;
  /** Unit identifier (Apt 1A, Suite 200) */
  unit: string;
  /** Unit square footage */
  squareFeet: number | null;
  /** Monthly rent amount (extracted if in document) */
  monthlyRate: number | null;
  /** Annual income (extracted if in document) */
  annualIncome: number | null;
  /** Whether unit is vacant */
  isVacant: boolean;
}

/**
 * Revenue stream (grouped by category)
 */
export interface RevenueStream {
  /** Unique stream identifier */
  id: string;
  /** Stream name (Office Rents, Parking, etc.) */
  name: string;
  /** Category: Residential, Commercial, or Miscellaneous */
  category: RevenueStreamCategory;
  /** Display order (1-based) */
  order: number;
  /** Individual unit/revenue rows */
  rows: RevenueRow[];
}

/**
 * Extraction result for revenue streams
 */
export interface RevenueStreamExtractionResult {
  /** Whether extraction succeeded */
  success: boolean;
  /** Extracted revenue streams */
  revenueStreams: RevenueStream[];
  /** Overall confidence score (0-1) */
  overallConfidence: number;
  /** Extraction reasoning for audit trail */
  reasoning: string;
  /** Any warnings or issues */
  warnings?: string[];
  /** Error message if failed */
  error?: string;
}
