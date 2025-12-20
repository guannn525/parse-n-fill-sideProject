/**
 * PARSE-N-FILL
 * Modular rent roll parsing API powered by Gemini AI
 *
 * @packageDocumentation
 */

// Revenue Stream Types
export type {
  RevenueStreamCategory,
  RevenueRow,
  RevenueStream,
  RevenueStreamExtractionResult,
} from "./types";

// Parser Layer
export { parseFile, getParser, canParse } from "./parsers";
export type {
  ParsedContent,
  ParsedContentMetadata,
  ParserInput,
  FileParser,
  ExcelSheetData,
} from "./parsers";

// Agent Layer
export { extractRevenueFromDocument } from "./agent";
export type { ExtractionResult, PropertyTypeHint } from "./agent";

// AI Tools (for direct usage)
export { extractRevenueStreams, executeRevenueStreamExtraction } from "./ai/tools";
export type { ExtractRevenueStreamsInput, ExtractRevenueStreamsOutput } from "./ai/tools";

// Zod Schemas (for validation)
export {
  revenueStreamCategorySchema,
  revenueRowSchema,
  revenueStreamSchema,
  extractRevenueStreamsInputSchema,
  extractRevenueStreamsOutputSchema,
} from "./ai/tools";

// Utilities
export {
  // Error classes
  ParseError,
  ValidationError,
  AIError,
  ExtractionError,
  ExportError,
  // Constants
  SUPPORTED_FILE_TYPES,
  FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  isSupportedFileType,
  getMimeTypeFromExtension,
  // Utility functions
  formatCurrency,
  parseNumericValue,
  sumRecord,
  getCurrentTimestamp,
  truncateText,
  getContextAround,
} from "./lib";

// Version
export const VERSION = "0.1.0";
