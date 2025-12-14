/**
 * PARSE-N-FILL Utility Library
 *
 * Centralized exports for error classes, constants, and utility functions.
 */

// Error classes
export {
  ParseError,
  ValidationError,
  AIError,
  ExtractionError,
  ExportError,
} from './errors.js';

// Constants
export {
  SUPPORTED_FILE_TYPES,
  FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  isSupportedFileType,
  getMimeTypeFromExtension,
  type SupportedMimeType,
} from './constants.js';

// Utility functions
export {
  formatCurrency,
  parseNumericValue,
  sumRecord,
  getCurrentTimestamp,
  truncateText,
  getContextAround,
} from './utils.js';
