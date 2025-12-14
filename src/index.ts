/**
 * PARSE-N-FILL
 * Modular financial document parsing API powered by Claude AI
 *
 * @packageDocumentation
 */

// Types
export type {
  DirectCapitalizationRateModel,
  DirectCapCalculations,
  DirectCapResult,
} from "./types";

// Schemas
export {
  directCapitalizationRateModelSchema,
  parseRequestSchema,
  exportRequestSchema,
} from "./schemas";

// API Handlers
export { parseDocument, type ParseDocumentRequest, type ParseDocumentResponse } from "./api";
export { exportToExcel, type ExportExcelRequest } from "./api";

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
