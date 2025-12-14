/**
 * CSV Parser
 *
 * Parses CSV files using PapaParse and returns structured data
 * with AI-readable text format. Limits row output for token efficiency.
 */

import * as Papa from 'papaparse';
import type { FileParser, ParserInput, ParsedContent } from './types';
import { ParseError } from '../lib/errors';

/**
 * Maximum number of rows to include in rawText output
 * (prevents token overflow for large CSVs)
 */
const MAX_ROWS_IN_TEXT = 100;

/**
 * CSV Parser implementation using PapaParse
 *
 * Features:
 * - Automatic header detection
 * - Dynamic typing (numbers parsed as numbers)
 * - Truncation for large files
 * - AI-optimized text format
 *
 * @example
 * ```typescript
 * const parser = csvParser;
 * const result = await parser.parse({
 *   fileBuffer: buffer,
 *   fileName: 'data.csv',
 *   mimeType: 'text/csv'
 * });
 * ```
 */
export const csvParser: FileParser = {
  supportedTypes: ['text/csv'],

  async parse(input: ParserInput): Promise<ParsedContent> {
    const startTime = Date.now();
    const { fileBuffer, fileName } = input;

    try {
      // Convert buffer to string
      const csvString = fileBuffer.toString('utf-8');

      // Parse CSV with PapaParse
      const parseResult = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        transformHeader: (header: string) => header.trim(),
      });

      // Check for parsing errors
      if (parseResult.errors.length > 0) {
        const criticalErrors = parseResult.errors.filter(
          (err) => err.type === 'FieldMismatch' || err.type === 'Quotes'
        );

        if (criticalErrors.length > 0) {
          throw new ParseError('CSV parsing failed with critical errors', {
            fileName,
            errors: criticalErrors.map((err) => ({
              type: err.type,
              code: err.code,
              message: err.message,
              row: err.row,
            })),
          });
        }
      }

      const data = parseResult.data as Record<string, unknown>[];
      const rowCount = data.length;
      const columns = parseResult.meta.fields || [];
      const columnCount = columns.length;

      // Validate we have data
      if (rowCount === 0) {
        throw new ParseError('CSV file is empty or contains no valid data', {
          fileName,
        });
      }

      if (columnCount === 0) {
        throw new ParseError('CSV file contains no column headers', {
          fileName,
        });
      }

      // Generate AI-readable text format
      const rawText = generateRawText(data, columns, rowCount);

      // Prepare metadata
      const metadata = {
        rowCount,
        columnCount,
        columnHeaders: columns,
        fileSizeBytes: fileBuffer.length,
        parsingDurationMs: Date.now() - startTime,
      };

      return {
        rawText,
        structuredData: data,
        metadata,
      };
    } catch (error) {
      // Re-throw ParseError as-is
      if (error instanceof ParseError) {
        throw error;
      }

      // Wrap other errors
      throw new ParseError('Failed to parse CSV file', {
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

/**
 * Generate AI-readable text format from CSV data
 *
 * @param data - Parsed CSV data
 * @param columns - Column headers
 * @param totalRows - Total number of rows
 * @returns Formatted text for AI consumption
 */
function generateRawText(
  data: Record<string, unknown>[],
  columns: string[],
  totalRows: number
): string {
  const lines: string[] = [];

  // Add summary header
  lines.push('CSV Data Summary:');
  lines.push(`- Total Rows: ${totalRows}`);
  lines.push(`- Columns: ${columns.join(', ')}`);
  lines.push('');

  // Determine how many rows to include
  const rowsToInclude = Math.min(totalRows, MAX_ROWS_IN_TEXT);
  const isTruncated = totalRows > MAX_ROWS_IN_TEXT;

  // Format each row
  for (let i = 0; i < rowsToInclude; i++) {
    const row = data[i];
    if (!row) continue; // Skip undefined rows

    lines.push(`Row ${i + 1}:`);

    for (const column of columns) {
      const value = row[column];
      const formattedValue = formatValue(value);
      lines.push(`  ${column}: ${formattedValue}`);
    }

    // Add blank line between rows for readability
    if (i < rowsToInclude - 1) {
      lines.push('');
    }
  }

  // Add truncation notice if applicable
  if (isTruncated) {
    lines.push('');
    lines.push(`[NOTE: Data truncated. Showing ${rowsToInclude} of ${totalRows} rows.]`);
    lines.push(`[Complete data available in structuredData field.]`);
  }

  return lines.join('\n');
}

/**
 * Format a value for display in rawText
 *
 * @param value - Value to format
 * @returns Formatted string representation
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }

  if (typeof value === 'string') {
    return value.trim() === '' ? '(empty)' : value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value.toString();
  }

  // For objects/arrays, convert to JSON
  return JSON.stringify(value);
}
