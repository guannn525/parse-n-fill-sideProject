/**
 * Parser Types
 *
 * Defines the consistent interface for all file parsers.
 * All parsers must implement the FileParser interface and return ParsedContent.
 */

import type { SupportedMimeType } from "../lib/constants";

/**
 * Metadata about the parsed document
 */
export interface ParsedContentMetadata {
  /** Number of pages (for PDFs/images) */
  pageCount?: number;
  /** Sheet names (for Excel files) */
  sheetNames?: string[];
  /** Number of data rows (for tabular data) */
  rowCount?: number;
  /** Number of columns (for tabular data) */
  columnCount?: number;
  /** Column headers (for CSV/Excel) */
  columnHeaders?: string[];
  /** File size in bytes */
  fileSizeBytes?: number;
  /** Parsing duration in milliseconds */
  parsingDurationMs?: number;
}

/**
 * Consistent output format for all parsers
 *
 * @example
 * ```typescript
 * const result: ParsedContent = {
 *   rawText: "Revenue: $100,000\nExpenses: $50,000",
 *   structuredData: [{ category: "Revenue", amount: 100000 }],
 *   metadata: { rowCount: 10, columnCount: 2 }
 * };
 * ```
 */
export interface ParsedContent {
  /** Extracted text content (AI-readable format) */
  rawText: string;
  /** Optional structured data (JSON tables, extracted arrays) */
  structuredData?: unknown;
  /** Document metadata */
  metadata: ParsedContentMetadata;
}

/**
 * Input configuration for parsers
 */
export interface ParserInput {
  /** File content as Buffer */
  fileBuffer: Buffer;
  /** Original file name */
  fileName: string;
  /** MIME type of the file */
  mimeType: SupportedMimeType;
}

/**
 * Parser interface - all parsers must implement this
 *
 * @example
 * ```typescript
 * const myParser: FileParser = {
 *   supportedTypes: ["text/csv"],
 *   async parse(input) {
 *     // Implementation
 *     return { rawText: "...", metadata: {} };
 *   }
 * };
 * ```
 */
export interface FileParser {
  /** Supported MIME types for this parser */
  supportedTypes: readonly SupportedMimeType[];

  /**
   * Parse the file and return structured content
   * @param input - Parser input configuration
   * @returns Parsed content with metadata
   * @throws ParseError on parsing failure
   */
  parse(input: ParserInput): Promise<ParsedContent>;
}

/**
 * Structured data format for Excel sheets
 */
export interface ExcelSheetData {
  /** Sheet name */
  name: string;
  /** Column headers */
  headers: string[];
  /** Row data (2D array) */
  data: string[][];
}
