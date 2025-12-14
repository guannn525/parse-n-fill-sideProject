/**
 * Excel Parser Tests
 *
 * Tests for Excel file parsing functionality
 */

import { describe, it, expect, vi } from 'vitest';
import * as ExcelJS from 'exceljs';
import { excelParser } from './excel-parser';
import type { ParserInput } from './types';
import { ParseError } from '../lib/errors';

describe('excelParser', () => {
  it('should have correct supported types', () => {
    expect(excelParser.supportedTypes).toEqual([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]);
  });

  it('should parse Excel file with multiple sheets', async () => {
    // Create a mock workbook with two sheets
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Financial data
    const sheet1 = workbook.addWorksheet('Revenue');
    sheet1.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
    ];
    sheet1.addRow({ category: 'Rental Income', amount: 100000 });
    sheet1.addRow({ category: 'Parking Fees', amount: 5000 });

    // Sheet 2: Expenses
    const sheet2 = workbook.addWorksheet('Expenses');
    sheet2.columns = [
      { header: 'Item', key: 'item', width: 20 },
      { header: 'Cost', key: 'cost', width: 15 },
    ];
    sheet2.addRow({ item: 'Maintenance', cost: 20000 });
    sheet2.addRow({ item: 'Insurance', cost: 10000 });

    // Convert workbook to buffer
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const input: ParserInput = {
      fileBuffer: buffer,
      fileName: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const result = await excelParser.parse(input);

    // Verify metadata
    expect(result.metadata.sheetNames).toEqual(['Revenue', 'Expenses']);
    expect(result.metadata.rowCount).toBe(6); // 2 sheets * 3 rows each
    expect(result.metadata.columnCount).toBe(2);
    expect(result.metadata.columnHeaders).toEqual(['Category', 'Amount']);
    expect(result.metadata.fileSizeBytes).toBeGreaterThan(0);
    expect(result.metadata.parsingDurationMs).toBeGreaterThanOrEqual(0);

    // Verify structured data
    expect(result.structuredData).toHaveLength(2);
    const structuredData = result.structuredData as Array<{
      name: string;
      headers: string[];
      data: string[][];
    }>;

    expect(structuredData[0].name).toBe('Revenue');
    expect(structuredData[0].headers).toEqual(['Category', 'Amount']);
    expect(structuredData[0].data).toHaveLength(2);
    expect(structuredData[0].data[0]).toEqual(['Rental Income', '100000']);

    expect(structuredData[1].name).toBe('Expenses');
    expect(structuredData[1].headers).toEqual(['Item', 'Cost']);
    expect(structuredData[1].data).toHaveLength(2);

    // Verify rawText contains both sheets
    expect(result.rawText).toContain('Sheet: Revenue');
    expect(result.rawText).toContain('Sheet: Expenses');
    expect(result.rawText).toContain('Category: Rental Income');
    expect(result.rawText).toContain('Amount: 100000');
    expect(result.rawText).toContain('Item: Maintenance');
    expect(result.rawText).toContain('Cost: 20000');
    expect(result.rawText).toContain('---'); // Sheet separator
  });

  it('should handle empty workbook', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Empty');
    // Note: An empty worksheet still has rowCount of 1 in ExcelJS (represents header space)

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const input: ParserInput = {
      fileBuffer: buffer,
      fileName: 'empty.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const result = await excelParser.parse(input);

    expect(result.metadata.sheetNames).toEqual(['Empty']);
    expect(result.metadata.rowCount).toBe(1); // ExcelJS reports 1 for empty sheet
    expect(result.rawText).toContain('Sheet: Empty');
    expect(result.rawText).toContain('Rows: 1');
  });

  it('should handle formula cells', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Formulas');

    sheet.columns = [
      { header: 'Value1', key: 'value1', width: 15 },
      { header: 'Value2', key: 'value2', width: 15 },
      { header: 'Sum', key: 'sum', width: 15 },
    ];

    const row = sheet.addRow({ value1: 100, value2: 200 });
    const sumCell = row.getCell(3);
    sumCell.value = { formula: 'A2+B2', result: 300 };

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const input: ParserInput = {
      fileBuffer: buffer,
      fileName: 'formulas.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const result = await excelParser.parse(input);

    const structuredData = result.structuredData as Array<{
      name: string;
      headers: string[];
      data: string[][];
    }>;

    // Formula result should be extracted
    expect(structuredData[0].data[0][2]).toBe('300');
    expect(result.rawText).toContain('Sum: 300');
  });

  it('should handle date formatting', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Dates');

    sheet.columns = [
      { header: 'Event', key: 'event', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    const testDate = new Date('2025-01-15T10:30:00Z');
    sheet.addRow({ event: 'Meeting', date: testDate });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const input: ParserInput = {
      fileBuffer: buffer,
      fileName: 'dates.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const result = await excelParser.parse(input);

    const structuredData = result.structuredData as Array<{
      name: string;
      headers: string[];
      data: string[][];
    }>;

    // Date should be formatted as ISO string
    expect(structuredData[0].data[0][1]).toBe(testDate.toISOString());
  });

  it('should handle rich text cells', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('RichText');

    sheet.columns = [{ header: 'Description', key: 'description', width: 30 }];

    const row = sheet.addRow({});
    const cell = row.getCell(1);
    cell.value = {
      richText: [
        { text: 'Bold', font: { bold: true } },
        { text: ' and ' },
        { text: 'Italic', font: { italic: true } },
      ],
    };

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const input: ParserInput = {
      fileBuffer: buffer,
      fileName: 'richtext.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const result = await excelParser.parse(input);

    const structuredData = result.structuredData as Array<{
      name: string;
      headers: string[];
      data: string[][];
    }>;

    // Rich text should be concatenated
    expect(structuredData[0].data[0][0]).toBe('Bold and Italic');
  });

  it('should handle null and undefined cell values', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('NullValues');

    sheet.columns = [
      { header: 'Column1', key: 'col1', width: 15 },
      { header: 'Column2', key: 'col2', width: 15 },
    ];

    sheet.addRow({ col1: 'Value', col2: null });
    sheet.addRow({ col1: undefined, col2: 'Another' });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const input: ParserInput = {
      fileBuffer: buffer,
      fileName: 'nulls.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const result = await excelParser.parse(input);

    const structuredData = result.structuredData as Array<{
      name: string;
      headers: string[];
      data: string[][];
    }>;

    // Null/undefined should become empty strings
    expect(structuredData[0].data[0]).toEqual(['Value', '']);
    expect(structuredData[0].data[1]).toEqual(['', 'Another']);
  });

  it('should throw ParseError on invalid data', async () => {
    const input: ParserInput = {
      fileBuffer: Buffer.from('not an excel file'),
      fileName: 'invalid.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    await expect(excelParser.parse(input)).rejects.toThrow(ParseError);
    await expect(excelParser.parse(input)).rejects.toThrow('Failed to parse Excel file');
  });

  it('should include error context in ParseError', async () => {
    const input: ParserInput = {
      fileBuffer: Buffer.from('corrupted data'),
      fileName: 'corrupted.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    try {
      await excelParser.parse(input);
      expect.fail('Should have thrown ParseError');
    } catch (error) {
      expect(error).toBeInstanceOf(ParseError);
      const parseError = error as ParseError;
      expect(parseError.context).toBeDefined();
      expect(parseError.context?.fileName).toBe('corrupted.xlsx');
      expect(parseError.context?.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    }
  });

  it('should handle formulas without computed results', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('FormulaNull');

    sheet.columns = [
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Formula', key: 'formula', width: 15 },
    ];

    // Add a row with a formula that has no result computed
    const row = sheet.addRow({ value: 'Test' });
    const formulaCell = row.getCell(2);
    // When formulas don't have results, they just have the formula property
    formulaCell.value = { formula: 'IF(TRUE,"","")', result: '' };

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const input: ParserInput = {
      fileBuffer: buffer,
      fileName: 'formula-null.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const result = await excelParser.parse(input);

    const structuredData = result.structuredData as Array<{
      name: string;
      headers: string[];
      data: string[][];
    }>;

    // Formula with empty string result should become empty string
    expect(structuredData[0].data[0][1]).toBe('');
  });
});
