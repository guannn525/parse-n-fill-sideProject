/**
 * Revenue Extraction Agent
 *
 * Orchestrates the full extraction pipeline:
 * Document → Parser → AI Extraction → RevenueStream[]
 *
 * Flow:
 * 1. Parse document to extract text/structured data
 * 2. Pass to AI extraction tool
 * 3. Return RevenueStream[] with metadata
 */

import { parseFile } from "../parsers";
import { executeRevenueStreamExtraction } from "../ai/tools";
import type { RevenueStream } from "../types/revenue-stream";

/**
 * Property type hint for categorization
 */
export type PropertyTypeHint = "residential" | "commercial" | "mixed_use" | "unknown";

/**
 * Result from revenue extraction pipeline
 */
export interface ExtractionResult {
  /** Whether extraction succeeded */
  success: boolean;
  /** Extracted revenue streams */
  revenueStreams: RevenueStream[];
  /** Overall confidence score (0-1) */
  confidence: number;
  /** AI reasoning about the extraction */
  reasoning: string;
  /** Any warnings or issues encountered */
  warnings: string[];
  /** Error message if extraction failed */
  error?: string;
  /** Metadata about the extraction process */
  metadata: {
    /** Original file name */
    fileName: string;
    /** File MIME type */
    mimeType: string;
    /** Time spent parsing (ms) */
    parsingDurationMs?: number;
    /** Time spent extracting (ms) */
    extractionDurationMs: number;
  };
}

/**
 * Extract revenue streams from a document
 *
 * Main entry point for the agent. Orchestrates parsing and AI extraction.
 *
 * @param fileBuffer - File content as Buffer
 * @param fileName - Original file name
 * @param mimeType - MIME type of the file
 * @param propertyTypeHint - Optional property type hint (residential, commercial, mixed_use, unknown)
 * @returns Extraction result with revenue streams and metadata
 *
 * @example
 * ```typescript
 * const result = await extractRevenueFromDocument(
 *   buffer,
 *   "rent-roll.pdf",
 *   "application/pdf",
 *   "residential"
 * );
 *
 * if (result.success) {
 *   console.log(`Extracted ${result.revenueStreams.length} streams`);
 *   console.log(`Confidence: ${result.confidence}`);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function extractRevenueFromDocument(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  propertyTypeHint?: PropertyTypeHint
): Promise<ExtractionResult> {
  const extractionStartTime = Date.now();

  try {
    // Step 1: Parse the document
    const parsedContent = await parseFile(fileBuffer, mimeType, fileName);

    // Step 2: Extract revenue streams using AI
    const extractionResult = await executeRevenueStreamExtraction({
      rawText: parsedContent.rawText,
      structuredData: parsedContent.structuredData,
      fileName,
      documentTypeHint: "rent_roll", // Default assumption for document type
      propertyTypeHint,
    });

    // Step 3: Build result with metadata
    const extractionDurationMs = Date.now() - extractionStartTime;

    return {
      success: extractionResult.success,
      revenueStreams: extractionResult.revenueStreams,
      confidence: extractionResult.overallConfidence,
      reasoning: extractionResult.reasoning,
      warnings: extractionResult.warnings || [],
      error: extractionResult.error,
      metadata: {
        fileName,
        mimeType,
        parsingDurationMs: parsedContent.metadata.parsingDurationMs,
        extractionDurationMs,
      },
    };
  } catch (error) {
    // Handle any unexpected errors gracefully
    const errorMessage = error instanceof Error ? error.message : "Unknown error during extraction";

    const extractionDurationMs = Date.now() - extractionStartTime;

    return {
      success: false,
      revenueStreams: [],
      confidence: 0,
      reasoning: "",
      warnings: [],
      error: `Revenue extraction failed: ${errorMessage}`,
      metadata: {
        fileName,
        mimeType,
        extractionDurationMs,
      },
    };
  }
}
