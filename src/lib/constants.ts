/**
 * Constants for PARSE-N-FILL
 *
 * Defines supported file types, extensions, size limits, and validation utilities.
 */

/**
 * Supported MIME types for document parsing
 */
export const SUPPORTED_FILE_TYPES = [
  // PDF
  'application/pdf',
  // Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  // CSV
  'text/csv',
  // Images
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

/**
 * Type for supported MIME types
 */
export type SupportedMimeType = typeof SUPPORTED_FILE_TYPES[number];

/**
 * Map of file extensions to MIME types
 */
export const FILE_EXTENSIONS: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
} as const;

/**
 * Maximum allowed file size: 10MB
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Check if a MIME type is supported for parsing
 *
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type is supported
 *
 * @example
 * ```typescript
 * isSupportedFileType('application/pdf') // true
 * isSupportedFileType('application/json') // false
 * ```
 */
export function isSupportedFileType(mimeType: string): boolean {
  return (SUPPORTED_FILE_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Get MIME type from file extension
 *
 * @param ext - File extension (with or without leading dot)
 * @returns MIME type or undefined if not supported
 *
 * @example
 * ```typescript
 * getMimeTypeFromExtension('.pdf') // 'application/pdf'
 * getMimeTypeFromExtension('pdf')  // 'application/pdf'
 * getMimeTypeFromExtension('.xyz') // undefined
 * ```
 */
export function getMimeTypeFromExtension(ext: string): string | undefined {
  // Normalize extension to include leading dot
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return FILE_EXTENSIONS[normalizedExt];
}
