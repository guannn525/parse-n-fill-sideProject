/**
 * Custom error classes for PARSE-N-FILL
 *
 * All error classes extend Error and include an optional context object
 * for debugging and logging purposes.
 */

/**
 * Error thrown during document parsing operations
 */
export class ParseError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'ParseError';
    // Maintains proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParseError);
    }
  }
}

/**
 * Error thrown when validation fails (e.g., Zod schema validation)
 */
export class ValidationError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Error thrown when AI/LLM operations fail
 */
export class AIError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'AIError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }
}

/**
 * Error thrown when financial data extraction fails
 */
export class ExtractionError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'ExtractionError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExtractionError);
    }
  }
}

/**
 * Error thrown when Excel export operations fail
 */
export class ExportError extends Error {
  constructor(message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'ExportError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExportError);
    }
  }
}
