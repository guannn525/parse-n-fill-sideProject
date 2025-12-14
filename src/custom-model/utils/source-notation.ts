/**
 * Source Notation Parser
 *
 * Parses and generates source notation strings for the Custom Financial Model system.
 *
 * Source notation format:
 * `${<valueKey>, tooltip:<sourceType>-<refType>:<refValue>}`
 *
 * Examples:
 * - ${totalRevenue, tooltip:userInput-index:0}
 * - ${noi, tooltip:calculated-key:netOperatingIncome}
 * - ${baseRent, tooltip:sourceDocument-id:page1-line15}
 */

/**
 * Parsed segment from source notation
 */
export interface ParsedSegment {
  /** Type of segment */
  type: 'text' | 'reference';

  /** Text content (for text segments) or value key (for reference segments) */
  content: string;

  /** Reference details (only for reference segments) */
  reference?: {
    /** Value key (e.g., "totalRevenue", "noi") */
    valueKey: string;

    /** Source type (e.g., "userInput", "calculated", "sourceDocument") */
    sourceType: string;

    /** Reference type (e.g., "index", "key", "id") */
    refType: string;

    /** Reference value (e.g., "0", "netOperatingIncome", "page1-line15") */
    refValue: string;
  };
}

/**
 * Source reference for generating notation
 */
export interface SourceNotationRef {
  /** Value key to display */
  valueKey: string;

  /** Source type */
  sourceType: 'userInput' | 'calculated' | 'sourceDocument' | 'assumption';

  /** Reference type and value */
  refType: 'index' | 'key' | 'id';
  refValue: string | number;
}

/**
 * Regular expression for matching source notation
 * Matches: ${valueKey, tooltip:sourceType-refType:refValue}
 */
const SOURCE_NOTATION_REGEX = /\$\{(\w+),\s*tooltip:(\w+)-(\w+):([^}]+)\}/g;

/**
 * Parse a text string containing source notation into segments
 *
 * @param text - Text containing source notation
 * @returns Array of parsed segments
 *
 * @example
 * ```typescript
 * const segments = parseSourceNotation(
 *   "Total revenue is ${totalRevenue, tooltip:calculated-key:grossPotentialIncome}"
 * );
 * // Returns:
 * // [
 * //   { type: 'text', content: 'Total revenue is ' },
 * //   {
 * //     type: 'reference',
 * //     content: 'totalRevenue',
 * //     reference: {
 * //       valueKey: 'totalRevenue',
 * //       sourceType: 'calculated',
 * //       refType: 'key',
 * //       refValue: 'grossPotentialIncome'
 * //     }
 * //   }
 * // ]
 * ```
 */
export function parseSourceNotation(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  // Reset regex state
  SOURCE_NOTATION_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = SOURCE_NOTATION_REGEX.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the reference segment
    const [, valueKey, sourceType, refType, refValue] = match;
    if (valueKey && sourceType && refType && refValue) {
      segments.push({
        type: 'reference',
        content: valueKey,
        reference: {
          valueKey,
          sourceType,
          refType,
          refValue,
        },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Generate source notation string from reference
 *
 * @param ref - Source reference details
 * @returns Formatted source notation string
 *
 * @example
 * ```typescript
 * const notation = generateSourceNotation({
 *   valueKey: 'noi',
 *   sourceType: 'calculated',
 *   refType: 'key',
 *   refValue: 'netOperatingIncome'
 * });
 * // Returns: '${noi, tooltip:calculated-key:netOperatingIncome}'
 * ```
 */
export function generateSourceNotation(ref: SourceNotationRef): string {
  return `\${${ref.valueKey}, tooltip:${ref.sourceType}-${ref.refType}:${ref.refValue}}`;
}

/**
 * Extract all source references from a text string
 *
 * @param text - Text containing source notation
 * @returns Array of source references found
 */
export function extractSourceReferences(text: string): SourceNotationRef[] {
  const references: SourceNotationRef[] = [];

  SOURCE_NOTATION_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = SOURCE_NOTATION_REGEX.exec(text)) !== null) {
    const [, valueKey, sourceType, refType, refValue] = match;
    if (valueKey && sourceType && refType && refValue) {
      references.push({
        valueKey,
        sourceType: sourceType as SourceNotationRef['sourceType'],
        refType: refType as SourceNotationRef['refType'],
        refValue,
      });
    }
  }

  return references;
}

/**
 * Replace source notation with actual values from a model
 *
 * @param text - Text containing source notation
 * @param valueResolver - Function to resolve value keys to display values
 * @returns Text with notation replaced by actual values
 *
 * @example
 * ```typescript
 * const result = replaceSourceNotation(
 *   "NOI is ${noi, tooltip:calculated-key:netOperatingIncome}",
 *   (ref) => formatCurrency(model.calculations.income[ref.refValue]?.value)
 * );
 * // Returns: "NOI is $156,000"
 * ```
 */
export function replaceSourceNotation(
  text: string,
  valueResolver: (ref: SourceNotationRef) => string
): string {
  return text.replace(SOURCE_NOTATION_REGEX, (_match, valueKey, sourceType, refType, refValue) => {
    const ref: SourceNotationRef = {
      valueKey: valueKey ?? '',
      sourceType: (sourceType as SourceNotationRef['sourceType']) ?? 'userInput',
      refType: (refType as SourceNotationRef['refType']) ?? 'key',
      refValue: refValue ?? '',
    };
    return valueResolver(ref);
  });
}

/**
 * Validate source notation syntax in a text string
 *
 * @param text - Text to validate
 * @returns Object with validation result and any errors
 */
export function validateSourceNotation(text: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for malformed notation (partial matches)
  const partialRegex = /\$\{[^}]*$/gm;
  if (partialRegex.test(text)) {
    errors.push('Unclosed source notation found (missing closing brace)');
  }

  // Check for invalid source types
  const validSourceTypes = ['userInput', 'calculated', 'sourceDocument', 'assumption'];
  const refs = extractSourceReferences(text);

  for (const ref of refs) {
    if (!validSourceTypes.includes(ref.sourceType)) {
      errors.push(`Invalid source type: ${ref.sourceType}. Valid types: ${validSourceTypes.join(', ')}`);
    }

    const validRefTypes = ['index', 'key', 'id'];
    if (!validRefTypes.includes(ref.refType)) {
      errors.push(`Invalid reference type: ${ref.refType}. Valid types: ${validRefTypes.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Build a brief reasoning summary with embedded source notation
 *
 * @param template - Template string with placeholders
 * @param values - Values to insert with source references
 * @returns Formatted summary with source notation
 *
 * @example
 * ```typescript
 * const summary = buildReasoningSummary(
 *   "Extracted {revenueCount} revenue items totaling {totalRevenue}.",
 *   {
 *     revenueCount: { value: 5, sourceType: 'calculated', refType: 'key', refValue: 'revenueItems.length' },
 *     totalRevenue: { value: '$500,000', sourceType: 'calculated', refType: 'key', refValue: 'grossPotentialIncome' }
 *   }
 * );
 * ```
 */
export function buildReasoningSummary(
  template: string,
  values: Record<string, { value: string | number } & Omit<SourceNotationRef, 'valueKey'>>
): string {
  let result = template;

  for (const [key, val] of Object.entries(values)) {
    const placeholder = `{${key}}`;
    const notation = generateSourceNotation({
      valueKey: String(val.value),
      sourceType: val.sourceType,
      refType: val.refType,
      refValue: val.refValue,
    });
    result = result.replace(placeholder, notation);
  }

  return result;
}
