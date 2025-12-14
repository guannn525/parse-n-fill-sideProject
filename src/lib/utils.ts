/**
 * Utility functions for PARSE-N-FILL
 *
 * Provides common utilities for formatting, parsing, and text manipulation.
 */

/**
 * Format a number as USD currency
 *
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * ```typescript
 * formatCurrency(1234.56)   // "$1,234.56"
 * formatCurrency(-500)      // "-$500.00"
 * formatCurrency(1000000)   // "$1,000,000.00"
 * ```
 */
export function formatCurrency(value: number): string {
  // Handle invalid numbers
  if (!isFinite(value) || isNaN(value)) {
    return '$0.00';
  }

  const isNegative = value < 0;
  const absValue = Math.abs(value);

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parse a numeric value from a string (handles currency formatting)
 *
 * @param value - String containing a number (e.g., "$1,234.56" or "1234.56")
 * @returns Parsed number or null if parsing fails
 *
 * @example
 * ```typescript
 * parseNumericValue("$1,234.56")  // 1234.56
 * parseNumericValue("1234.56")    // 1234.56
 * parseNumericValue("-$500.00")   // -500
 * parseNumericValue("($500.00)")  // -500 (accounting format)
 * parseNumericValue("invalid")    // null
 * ```
 */
export function parseNumericValue(value: string): number | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Handle accounting format: (1234.56) means negative
  const isAccountingNegative = value.trim().startsWith('(') && value.trim().endsWith(')');

  // Remove currency symbols, commas, parentheses, and whitespace
  const cleaned = value
    .replace(/[$,\s()]/g, '')
    .trim();

  // Parse the number
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return null;
  }

  return isAccountingNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Sum all numeric values in a Record
 *
 * @param record - Record object with numeric values
 * @returns Sum of all values
 *
 * @example
 * ```typescript
 * sumRecord({ rent: 1000, utilities: 200 })  // 1200
 * sumRecord({})                               // 0
 * ```
 */
export function sumRecord(record: Record<string, number>): number {
  return Object.values(record).reduce((sum, value) => sum + value, 0);
}

/**
 * Get current timestamp in ISO 8601 format
 *
 * @returns ISO 8601 formatted timestamp
 *
 * @example
 * ```typescript
 * getCurrentTimestamp()  // "2025-12-13T14:30:00.000Z"
 * ```
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * ```typescript
 * truncateText("Hello world", 5)      // "He..."
 * truncateText("Hello", 10)           // "Hello"
 * truncateText("Long text here", 10)  // "Long te..."
 * ```
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Reserve 3 characters for ellipsis
  const truncateLength = Math.max(0, maxLength - 3);
  return text.slice(0, truncateLength) + '...';
}

/**
 * Extract context around a specific position in text
 *
 * @param text - Source text
 * @param position - Center position (character index)
 * @param contextChars - Number of characters to include on each side (default: 50)
 * @returns Text snippet centered around the position
 *
 * @example
 * ```typescript
 * const text = "The quick brown fox jumps over the lazy dog";
 * getContextAround(text, 16, 10)  // "wn fox jumps ov"
 * getContextAround(text, 0, 10)   // "The quick "
 * ```
 */
export function getContextAround(
  text: string,
  position: number,
  contextChars: number = 50
): string {
  if (!text || position < 0 || position >= text.length) {
    return '';
  }

  const start = Math.max(0, position - contextChars);
  const end = Math.min(text.length, position + contextChars + 1);

  let context = text.slice(start, end);

  // Add ellipsis if we truncated
  if (start > 0) {
    context = '...' + context;
  }
  if (end < text.length) {
    context = context + '...';
  }

  return context;
}
