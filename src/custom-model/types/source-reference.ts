/**
 * Source Attribution Types
 *
 * These types enable click-through verification (DataSnipper pattern)
 * by linking every value back to its origin - whether user input,
 * parsed document, or calculation.
 */

/**
 * Type of source where a value originated
 */
export type SourceType =
  | 'user_input' // User manually entered value
  | 'parsed_document' // Extracted from document by AI
  | 'calculated' // Derived from other values
  | 'default' // System default value
  | 'assumption'; // Agent assumption with reasoning

/**
 * Location within a source document
 * Enables click-through verification to exact position
 */
export interface DocumentLocation {
  /** Original filename */
  fileName: string;

  /** MIME type */
  fileType: string;

  /** Page number (for PDFs, 1-indexed) */
  page?: number;

  /** Cell reference for spreadsheets (e.g., "B15", "Sheet1!C20") */
  cellRef?: string;

  /** Line number (for text documents) */
  line?: number;

  /** Bounding box for visual highlighting (PDFs, images) */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** Raw text as it appeared in document (before parsing) */
  rawText?: string;

  /** Section or table name if identifiable */
  section?: string;
}

/**
 * Complete source reference for audit trail
 * Every extracted/calculated value should have this
 */
export interface SourceReference {
  /** Type of source */
  sourceType: SourceType;

  /** Reference identifier based on sourceType */
  reference: {
    /** For userInput arrays: index position */
    index?: number;

    /** For objects: key name */
    key?: string;

    /** For documents: unique line/section ID */
    id?: string;
  };

  /** Human-readable path for tooltip display */
  displayPath: string;

  /** Confidence score for AI-extracted values (0-1) */
  confidence?: number;

  /** ISO 8601 timestamp when value was set/extracted */
  timestamp: string;

  /** Document location if from parsed document */
  documentLocation?: DocumentLocation;

  /** ID of parsing session that extracted this */
  parsingSessionId?: string;

  /** User ID if from user input */
  userId?: string;
}

/**
 * Footnote attached to a value for additional context
 */
export interface Footnote {
  /** Unique identifier */
  id: string;

  /** Display symbol (e.g., "*", "1", "a", "†") */
  symbol: string;

  /** Footnote text */
  text: string;

  /** Category of footnote */
  category: 'assumption' | 'exception' | 'clarification' | 'warning';
}

/**
 * Value with source tracking
 * Used for individual values in userInput
 */
export interface ValueWithSource<T = number | string | null> {
  /** The actual value */
  value: T;

  /** Source reference for audit trail */
  source: SourceReference;
}

/**
 * Numeric value with source and optional footnotes
 */
export interface NumberWithSource extends ValueWithSource<number | null> {
  value: number | null;
}

/**
 * String value with source
 */
export interface StringWithSource extends ValueWithSource<string> {
  value: string;
}
