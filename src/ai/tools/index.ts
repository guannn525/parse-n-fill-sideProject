/**
 * AI Tools Export
 *
 * Central export point for all AI agent tools.
 * Import from here in the agent to keep code clean.
 *
 * @example
 * ```typescript
 * import { extractFinancialData, categorizeLineItems } from "@/ai/tools";
 *
 * // Step 1: Extract line items from parsed content
 * const extraction = await extractFinancialData.execute({
 *   rawText: parsedContent.rawText,
 *   structuredData: parsedContent.structuredData,
 *   fileName: "rent_roll.pdf",
 *   documentTypeHint: "rent_roll",
 * });
 *
 * // Step 2: Categorize into revenue/expense/adjustment
 * const categorization = await categorizeLineItems.execute({
 *   lineItems: extraction.lineItems,
 * });
 * ```
 */

// Tool exports
export { extractFinancialData } from "./extract-financial-data";
export { categorizeLineItems } from "./categorize-line-items";
export { extractRevenueStreams, executeRevenueStreamExtraction } from "./extract-revenue-streams";

// Type exports
export type {
  // Time and category types
  TimePeriod,
  FinancialCategory,
  DocumentTypeHint,
  // Line item types
  ExtractedLineItem,
  CategorizedLineItem,
  // Result types
  ExtractionResult,
  CategorizationResult,
  // Input types (inferred from Zod)
  ExtractionInput,
  CategorizationInput,
} from "./types";

// Revenue stream type exports
export type {
  RevenueStreamCategory,
  RevenueRowInput,
  RevenueStreamInput,
  ExtractRevenueStreamsInput,
  ExtractRevenueStreamsOutput,
} from "./revenue-stream-types";

// Schema exports (for validation or extending)
export {
  extractionInputSchema,
  extractionOutputSchema,
  extractedLineItemSchema,
  categorizationInputSchema,
  categorizationOutputSchema,
  categorizedItemSchema,
} from "./types";

// Revenue stream schema exports
export {
  revenueStreamCategorySchema,
  revenueRowSchema,
  revenueStreamSchema,
  extractRevenueStreamsInputSchema,
  extractRevenueStreamsOutputSchema,
} from "./revenue-stream-types";
