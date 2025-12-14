/**
 * Parser Factory
 *
 * Detects file type and returns the appropriate parser.
 *
 * Strategy:
 * - PDF: Claude vision (text extraction, table detection)
 * - Excel: ExcelJS (local parsing, multi-sheet support)
 * - CSV: PapaParse (local parsing, streaming for large files)
 * - Images: Claude vision (OCR, document understanding)
 *
 * @example
 * ```typescript
 * import { parseFile } from "./parsers";
 *
 * const content = await parseFile(buffer, "application/pdf", "financials.pdf");
 * console.log(content.rawText);
 * console.log(content.metadata.pageCount);
 * ```
 */

import {
  SUPPORTED_FILE_TYPES,
  type SupportedMimeType,
  isSupportedFileType,
  getMimeTypeFromExtension,
} from "../lib/constants";
import { ParseError } from "../lib/errors";
import type { FileParser, ParsedContent } from "./types";

// Parser imports
import { pdfParser } from "./pdf-parser";
import { excelParser } from "./excel-parser";
import { csvParser } from "./csv-parser";
import { imageParser } from "./image-parser";

// Re-export types for convenience
export type {
  ParsedContent,
  ParsedContentMetadata,
  ParserInput,
  FileParser,
  ExcelSheetData,
} from "./types";

/**
 * Map of MIME types to parser instances
 */
const PARSER_MAP: Record<SupportedMimeType, FileParser> = {
  "application/pdf": pdfParser,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": excelParser,
  "application/vnd.ms-excel": excelParser,
  "text/csv": csvParser,
  "image/png": imageParser,
  "image/jpeg": imageParser,
  "image/webp": imageParser,
};

/**
 * Get the appropriate parser for a file type
 *
 * @param mimeType - MIME type of the file
 * @returns Parser instance
 * @throws ParseError if file type is not supported
 *
 * @example
 * ```typescript
 * const parser = getParser("application/pdf");
 * const content = await parser.parse({ fileBuffer, fileName, mimeType });
 * ```
 */
export function getParser(mimeType: string): FileParser {
  if (!isSupportedFileType(mimeType)) {
    throw new ParseError(`Unsupported file type: ${mimeType}`, {
      mimeType,
      supportedTypes: SUPPORTED_FILE_TYPES,
    });
  }

  return PARSER_MAP[mimeType as SupportedMimeType];
}

/**
 * Parse a file buffer and return structured content
 *
 * Main entry point for the parser layer.
 *
 * @param fileBuffer - File content as Buffer
 * @param mimeType - MIME type (or file extension)
 * @param fileName - Original file name
 * @returns Parsed content with metadata
 *
 * @example
 * ```typescript
 * const content = await parseFile(buffer, "application/pdf", "financials.pdf");
 * console.log(content.rawText);
 * console.log(content.metadata.pageCount);
 * ```
 */
export async function parseFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedContent> {
  const startTime = Date.now();

  // Resolve MIME type from extension if needed
  let resolvedMimeType = mimeType;
  if (!isSupportedFileType(mimeType) && fileName) {
    const ext = fileName.slice(fileName.lastIndexOf("."));
    const detected = getMimeTypeFromExtension(ext);
    if (detected) {
      resolvedMimeType = detected;
    }
  }

  const parser = getParser(resolvedMimeType);

  const result = await parser.parse({
    fileBuffer,
    fileName,
    mimeType: resolvedMimeType as SupportedMimeType,
  });

  // Add parsing duration and file size to metadata
  result.metadata.parsingDurationMs = Date.now() - startTime;
  result.metadata.fileSizeBytes = fileBuffer.length;

  return result;
}

/**
 * Check if a file type can be parsed
 *
 * @param mimeType - MIME type to check
 * @returns True if the MIME type is supported
 *
 * @example
 * ```typescript
 * if (canParse("application/pdf")) {
 *   const content = await parseFile(buffer, "application/pdf", "doc.pdf");
 * }
 * ```
 */
export function canParse(mimeType: string): boolean {
  return isSupportedFileType(mimeType);
}
