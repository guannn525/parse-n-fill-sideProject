/**
 * AI Tools Export
 *
 * Central export point for AI agent tools.
 *
 * @example
 * ```typescript
 * import { executeRevenueStreamExtraction } from "@/ai/tools";
 *
 * const result = await executeRevenueStreamExtraction({
 *   rawText: parsedContent.rawText,
 *   structuredData: parsedContent.structuredData,
 *   fileName: "rent_roll.pdf",
 *   documentTypeHint: "rent_roll",
 * });
 * ```
 */

// Tool exports
export { extractRevenueStreams, executeRevenueStreamExtraction } from "./extract-revenue-streams";

// Revenue stream type exports
export type {
  RevenueStreamCategory,
  RevenueRowInput,
  RevenueStreamInput,
  ExtractRevenueStreamsInput,
  ExtractRevenueStreamsOutput,
} from "./revenue-stream-types";

// Revenue stream schema exports
export {
  revenueStreamCategorySchema,
  revenueRowSchema,
  revenueStreamSchema,
  extractRevenueStreamsInputSchema,
  extractRevenueStreamsOutputSchema,
} from "./revenue-stream-types";
