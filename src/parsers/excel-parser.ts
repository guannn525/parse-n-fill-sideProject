/**
 * Excel Parser
 *
 * Parses Excel files (.xlsx, .xls) using ExcelJS.
 * Processes all worksheets and extracts structured data.
 */

import * as ExcelJS from 'exceljs';
import type { FileParser, ParserInput, ParsedContent, ExcelSheetData } from './types';
import { ParseError } from '../lib/errors';

/**
 * Excel file parser implementation
 *
 * Supports both .xlsx (OpenXML) and .xls (legacy Excel) formats.
 * Extracts all worksheets with proper handling of formulas, dates, and rich text.
 */
export const excelParser: FileParser = {
  supportedTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],

  async parse(input: ParserInput): Promise<ParsedContent> {
    const startTime = Date.now();

    try {
      // Create workbook instance
      const workbook = new ExcelJS.Workbook();

      // CRITICAL: Safe buffer conversion to avoid ArrayBuffer sharing issues
      // Create isolated ArrayBuffer copy from Buffer
      const arrayBuffer: ArrayBuffer = input.fileBuffer.buffer.slice(
        input.fileBuffer.byteOffset,
        input.fileBuffer.byteOffset + input.fileBuffer.byteLength
      ) as ArrayBuffer;

      // Load workbook from ArrayBuffer
      await workbook.xlsx.load(arrayBuffer);

      // Process all worksheets
      const structuredData: ExcelSheetData[] = [];
      const sheetNames: string[] = [];
      let totalRows = 0;
      let maxColumns = 0;

      // Build AI-readable text representation
      const textParts: string[] = [];

      for (const worksheet of workbook.worksheets) {
        const sheetName = worksheet.name;
        sheetNames.push(sheetName);

        // Extract headers from first row
        const firstRow = worksheet.getRow(1);
        const headers: string[] = [];
        const columnCount = worksheet.columnCount;

        for (let colNum = 1; colNum <= columnCount; colNum++) {
          const cell = firstRow.getCell(colNum);
          headers.push(formatCellValue(cell));
        }

        // Extract data rows (skip header row)
        const data: string[][] = [];
        const rowCount = worksheet.rowCount;

        for (let rowNum = 2; rowNum <= rowCount; rowNum++) {
          const row = worksheet.getRow(rowNum);
          const rowData: string[] = [];

          for (let colNum = 1; colNum <= columnCount; colNum++) {
            const cell = row.getCell(colNum);
            rowData.push(formatCellValue(cell));
          }

          data.push(rowData);
        }

        // Update statistics
        totalRows += rowCount;
        maxColumns = Math.max(maxColumns, columnCount);

        // Store structured data for this sheet
        structuredData.push({
          name: sheetName,
          headers,
          data,
        });

        // Format sheet as AI-readable text
        textParts.push(formatSheetAsText(sheetName, headers, data, rowCount));
      }

      // Combine all sheets with separators
      const rawText = textParts.join('\n\n---\n\n');

      const parsingDurationMs = Date.now() - startTime;

      return {
        rawText,
        structuredData,
        metadata: {
          sheetNames,
          rowCount: totalRows,
          columnCount: maxColumns,
          columnHeaders: structuredData[0]?.headers,
          fileSizeBytes: input.fileBuffer.byteLength,
          parsingDurationMs,
        },
      };
    } catch (error) {
      throw new ParseError(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          fileName: input.fileName,
          mimeType: input.mimeType,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  },
};

/**
 * Format a cell value to string
 *
 * Handles formulas, dates, rich text, and null values appropriately.
 */
function formatCellValue(cell: ExcelJS.Cell): string {
  const value = cell.value;

  if (value === null || value === undefined) {
    return '';
  }

  // Handle formula cells - use the result value if available
  if (typeof value === 'object' && value !== null && 'formula' in value) {
    const formulaValue = value as { formula: string; result?: unknown };
    // If result is present, use it; otherwise return empty string
    if ('result' in formulaValue) {
      const result = formulaValue.result;
      if (result === null || result === undefined || result === '') {
        return '';
      }
      return formatValue(result);
    }
    // Formula without result - return empty string
    return '';
  }

  // Handle rich text cells
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const richTextValue = value as { richText: Array<{ text: string }> };
    return richTextValue.richText.map(segment => segment.text).join('');
  }

  return formatValue(value);
}

/**
 * Format a cell value (handles dates and basic types)
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle dates
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle numbers and strings
  return String(value);
}

/**
 * Format a worksheet as AI-readable text
 *
 * @param sheetName - Name of the worksheet
 * @param headers - Column headers
 * @param data - Row data
 * @param rowCount - Total row count including header
 * @returns Formatted text representation
 */
function formatSheetAsText(
  sheetName: string,
  headers: string[],
  data: string[][],
  rowCount: number
): string {
  const parts: string[] = [];

  // Sheet header
  parts.push(`Sheet: ${sheetName}`);
  parts.push(`Rows: ${rowCount}`);
  parts.push(`Columns: ${headers.filter(h => h).join(', ')}`);
  parts.push('');

  // Format each data row
  data.forEach((row, index) => {
    const rowNum = index + 2;
    parts.push(`Row ${rowNum}:`);

    // For each column, format as "header: value"
    row.forEach((value, colIndex) => {
      const header = headers[colIndex];
      if (value && header) {
        parts.push(`  ${header}: ${value}`);
      }
    });
  });

  return parts.join('\n');
}
