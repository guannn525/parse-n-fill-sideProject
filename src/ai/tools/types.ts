/**
 * AI Tools Shared Types
 *
 * Type definitions and Zod schemas for financial extraction and categorization tools.
 */

import { z } from "zod";

/**
 * Detected time period in source document
 */
export type TimePeriod = "monthly" | "quarterly" | "annual" | "unknown";

/**
 * Financial category for categorization
 */
export type FinancialCategory = "revenue" | "expense" | "adjustment";

/**
 * Document type hints for improved extraction accuracy
 */
export type DocumentTypeHint =
  | "rent_roll"
  | "operating_statement"
  | "profit_loss"
  | "unknown";

/**
 * Raw extracted line item before categorization
 */
export interface ExtractedLineItem {
  /** Original label from document */
  label: string;
  /** Extracted numerical value */
  value: number;
  /** Confidence score 0-1 */
  confidence: number;
  /** Original time period in source */
  originalPeriod: TimePeriod;
  /** Annualized value (if conversion needed) */
  annualizedValue: number;
  /** Context from document (surrounding text, table location) */
  context?: string;
  /** Extraction reasoning */
  reasoning: string;
}

/**
 * Categorized line item with category assignment
 */
export interface CategorizedLineItem extends ExtractedLineItem {
  /** Assigned category */
  category: FinancialCategory;
  /** Subcategory within main category */
  subcategory: string;
  /** Normalized key for output (camelCase) */
  normalizedKey: string;
  /** Categorization reasoning */
  categorizationReasoning: string;
  /** Flags for review */
  flags?: string[];
}

/**
 * Extraction tool result
 */
export interface ExtractionResult {
  success: boolean;
  lineItems: ExtractedLineItem[];
  overallConfidence: number;
  reasoning: string;
  warnings?: string[];
  error?: string;
}

/**
 * Categorization tool result
 */
export interface CategorizationResult {
  success: boolean;
  categorizedItems: CategorizedLineItem[];
  summary: {
    revenueCount: number;
    expenseCount: number;
    adjustmentCount: number;
  };
  reasoning: string;
  flaggedForReview: CategorizedLineItem[];
  error?: string;
}

/**
 * Zod schema for extraction tool input
 */
export const extractionInputSchema = z.object({
  rawText: z.string().describe("AI-readable text content from parser"),
  structuredData: z
    .unknown()
    .optional()
    .describe("Optional JSON data (Excel/CSV rows)"),
  fileName: z.string().describe("Original file name for context"),
  documentTypeHint: z
    .enum(["rent_roll", "operating_statement", "profit_loss", "unknown"])
    .optional()
    .describe("Hint about document type to guide extraction"),
});

/**
 * Zod schema for extracted line item in AI response
 */
export const extractedLineItemSchema = z.object({
  label: z.string().describe("Original label from document"),
  value: z.number().describe("Extracted numerical value"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
  originalPeriod: z.enum(["monthly", "quarterly", "annual", "unknown"]),
  annualizedValue: z
    .number()
    .describe("Value annualized (monthly*12, quarterly*4)"),
  context: z
    .string()
    .optional()
    .describe("Surrounding context from document"),
  reasoning: z
    .string()
    .describe("Why this was identified as a financial item"),
});

/**
 * Zod schema for extraction output from AI
 */
export const extractionOutputSchema = z.object({
  lineItems: z.array(extractedLineItemSchema),
  overallConfidence: z.number().min(0).max(1),
  reasoning: z.string().describe("Overall extraction reasoning for audit trail"),
  warnings: z.array(z.string()).optional(),
});

/**
 * Zod schema for categorization tool input
 */
export const categorizationInputSchema = z.object({
  lineItems: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        confidence: z.number(),
        originalPeriod: z.enum(["monthly", "quarterly", "annual", "unknown"]),
        annualizedValue: z.number(),
        context: z.string().optional(),
        reasoning: z.string(),
      })
    )
    .describe("Extracted line items from extraction tool"),
  customMappings: z
    .record(z.string(), z.enum(["revenue", "expense", "adjustment"]))
    .optional()
    .describe("Optional custom category mappings (label -> category)"),
});

/**
 * Zod schema for categorized item in AI response
 */
export const categorizedItemSchema = z.object({
  label: z.string(),
  value: z.number(),
  annualizedValue: z.number(),
  category: z.enum(["revenue", "expense", "adjustment"]),
  subcategory: z
    .string()
    .describe("Specific subcategory (e.g., 'baseRent', 'propertyTax')"),
  normalizedKey: z.string().describe("camelCase key for output JSON"),
  categorizationReasoning: z
    .string()
    .describe("Why this category was chosen"),
  flags: z
    .array(z.string())
    .optional()
    .describe("Any flags for review"),
});

/**
 * Zod schema for categorization output from AI
 */
export const categorizationOutputSchema = z.object({
  categorizedItems: z.array(categorizedItemSchema),
  reasoning: z.string().describe("Overall categorization reasoning for audit"),
});

/**
 * Type inference from Zod schemas
 */
export type ExtractionInput = z.infer<typeof extractionInputSchema>;
export type CategorizationInput = z.infer<typeof categorizationInputSchema>;
