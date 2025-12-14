/**
 * CSV Parser Tests
 *
 * Tests for CSV file parsing using PapaParse
 */

import { describe, it, expect } from 'vitest';
import { csvParser } from './csv-parser';
import type { ParserInput } from './types';
import { ParseError } from '../lib/errors';

describe('csvParser', () => {
  it('should have correct supportedTypes', () => {
    expect(csvParser.supportedTypes).toEqual(['text/csv']);
  });

  it('should parse valid CSV with headers', async () => {
    const csvContent = `Name,Amount,Category
Rental Income,100000,Revenue
Property Tax,15000,Expense
Insurance,5000,Expense`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'test.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);

    // Check structured data
    expect(result.structuredData).toBeDefined();
    const data = result.structuredData as Record<string, unknown>[];
    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({
      Name: 'Rental Income',
      Amount: 100000,
      Category: 'Revenue',
    });
    expect(data[1]).toEqual({
      Name: 'Property Tax',
      Amount: 15000,
      Category: 'Expense',
    });

    // Check metadata
    expect(result.metadata.rowCount).toBe(3);
    expect(result.metadata.columnCount).toBe(3);
    expect(result.metadata.columnHeaders).toEqual(['Name', 'Amount', 'Category']);
    expect(result.metadata.fileSizeBytes).toBeGreaterThan(0);
    expect(result.metadata.parsingDurationMs).toBeGreaterThanOrEqual(0);

    // Check rawText format
    expect(result.rawText).toContain('CSV Data Summary:');
    expect(result.rawText).toContain('Total Rows: 3');
    expect(result.rawText).toContain('Columns: Name, Amount, Category');
    expect(result.rawText).toContain('Row 1:');
    expect(result.rawText).toContain('Name: Rental Income');
    expect(result.rawText).toContain('Amount: 100000');
    expect(result.rawText).toContain('Row 2:');
    expect(result.rawText).toContain('Property Tax');
  });

  it('should handle dynamic typing for numbers', async () => {
    const csvContent = `Item,Price,Quantity,InStock
Widget,19.99,100,true
Gadget,49.50,50,false`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'products.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);
    const data = result.structuredData as Record<string, unknown>[];

    // Verify numbers are parsed as numbers, not strings
    expect(data[0].Price).toBe(19.99);
    expect(typeof data[0].Price).toBe('number');
    expect(data[0].Quantity).toBe(100);
    expect(typeof data[0].Quantity).toBe('number');

    // Verify booleans
    expect(data[0].InStock).toBe(true);
    expect(typeof data[0].InStock).toBe('boolean');
    expect(data[1].InStock).toBe(false);
  });

  it('should handle empty CSV file', async () => {
    const csvContent = '';

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'empty.csv',
      mimeType: 'text/csv',
    };

    await expect(csvParser.parse(input)).rejects.toThrow(ParseError);
    await expect(csvParser.parse(input)).rejects.toThrow(
      'CSV file is empty or contains no valid data'
    );
  });

  it('should handle CSV with only headers', async () => {
    const csvContent = 'Name,Amount,Category';

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'headers-only.csv',
      mimeType: 'text/csv',
    };

    await expect(csvParser.parse(input)).rejects.toThrow(ParseError);
    await expect(csvParser.parse(input)).rejects.toThrow(
      'CSV file is empty or contains no valid data'
    );
  });

  it('should handle CSV with no headers', async () => {
    const csvContent = `100000,Revenue
15000,Expense`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'no-headers.csv',
      mimeType: 'text/csv',
    };

    // PapaParse with header:true will use first row as headers
    // So we should still get data, but the headers will be the first row values
    const result = await csvParser.parse(input);
    expect(result.metadata.rowCount).toBe(1);
  });

  it('should skip empty lines', async () => {
    const csvContent = `Name,Amount

Rental Income,100000

Property Tax,15000

`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'with-blanks.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);
    const data = result.structuredData as Record<string, unknown>[];

    // Should only have 2 data rows (empty lines skipped)
    expect(data).toHaveLength(2);
    expect(result.metadata.rowCount).toBe(2);
  });

  it('should truncate rawText for CSV with >100 rows', async () => {
    // Generate CSV with 150 rows
    const lines = ['ID,Value'];
    for (let i = 1; i <= 150; i++) {
      lines.push(`${i},${i * 100}`);
    }
    const csvContent = lines.join('\n');

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'large.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);
    const data = result.structuredData as Record<string, unknown>[];

    // Structured data should have all rows
    expect(data).toHaveLength(150);
    expect(result.metadata.rowCount).toBe(150);

    // rawText should contain truncation notice
    expect(result.rawText).toContain('Total Rows: 150');
    expect(result.rawText).toContain('Row 1:');
    expect(result.rawText).toContain('Row 100:');
    expect(result.rawText).not.toContain('Row 101:');
    expect(result.rawText).toContain('[NOTE: Data truncated. Showing 100 of 150 rows.]');
    expect(result.rawText).toContain('[Complete data available in structuredData field.]');
  });

  it('should not show truncation notice for exactly 100 rows', async () => {
    // Generate CSV with exactly 100 rows
    const lines = ['ID,Value'];
    for (let i = 1; i <= 100; i++) {
      lines.push(`${i},${i * 100}`);
    }
    const csvContent = lines.join('\n');

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'hundred.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);

    // Should not show truncation notice
    expect(result.rawText).toContain('Total Rows: 100');
    expect(result.rawText).not.toContain('Data truncated');
  });

  it('should handle empty and null values', async () => {
    const csvContent = `Name,Amount,Notes
Item 1,,Some note
Item 2,100,
Item 3,,`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'nulls.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);
    const data = result.structuredData as Record<string, unknown>[];

    expect(data).toHaveLength(3);
    // PapaParse with dynamicTyping converts empty values to null
    expect(data[0].Amount).toBe(null);
    expect(data[1].Notes).toBe(null);

    // Check rawText formatting for empty values
    expect(result.rawText).toContain('Amount: (empty)');
    expect(result.rawText).toContain('Notes: (empty)');
  });

  it('should trim column headers', async () => {
    const csvContent = `  Name  ,  Amount  ,  Category
Item 1,100,Revenue`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'spaces.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);

    // Headers should be trimmed
    expect(result.metadata.columnHeaders).toEqual(['Name', 'Amount', 'Category']);
  });

  it('should handle quoted values with commas', async () => {
    const csvContent = `Name,Description,Amount
"Smith, John","Senior Manager, Sales",100000
"Doe, Jane","Junior Analyst, Finance",50000`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'quoted.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);
    const data = result.structuredData as Record<string, unknown>[];

    expect(data).toHaveLength(2);
    expect(data[0].Name).toBe('Smith, John');
    expect(data[0].Description).toBe('Senior Manager, Sales');
  });

  it('should handle special characters and unicode', async () => {
    const csvContent = `Item,Price,Symbol
Café Latte,4.50,€
Crème Brûlée,8.00,£
Nacho's Tacos,12.99,$`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'unicode.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);
    const data = result.structuredData as Record<string, unknown>[];

    expect(data).toHaveLength(3);
    expect(data[0].Item).toBe('Café Latte');
    expect(data[1].Item).toBe('Crème Brûlée');
    expect(data[0].Symbol).toBe('€');
  });

  it('should throw ParseError with context on malformed CSV', async () => {
    // Create malformed CSV (unclosed quote)
    const csvContent = `Name,Amount
"Unclosed Quote,100
Normal Row,200`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'malformed.csv',
      mimeType: 'text/csv',
    };

    try {
      await csvParser.parse(input);
      expect.fail('Should have thrown ParseError');
    } catch (error) {
      expect(error).toBeInstanceOf(ParseError);
      if (error instanceof ParseError) {
        expect(error.message).toContain('CSV parsing failed');
        expect(error.context).toBeDefined();
        expect(error.context?.fileName).toBe('malformed.csv');
      }
    }
  });

  it('should handle various numeric formats', async () => {
    const csvContent = `Item,Integer,Float,Negative,Scientific
A,100,100.50,-50,1e3
B,0,0.01,-0.5,2.5e2`;

    const input: ParserInput = {
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      fileName: 'numbers.csv',
      mimeType: 'text/csv',
    };

    const result = await csvParser.parse(input);
    const data = result.structuredData as Record<string, unknown>[];

    expect(data[0].Integer).toBe(100);
    expect(data[0].Float).toBe(100.5);
    expect(data[0].Negative).toBe(-50);
    expect(data[0].Scientific).toBe(1000);
    expect(data[1].Scientific).toBe(250);
  });
});
