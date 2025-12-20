/**
 * Tool: extractRevenueStreams
 *
 * Extracts rent roll data into RevenueStream[] format for other_branch integration.
 * Uses Gemini AI for intelligent extraction and categorization.
 *
 * Workflow:
 * 1. Parser outputs ParsedContent
 * 2. extractRevenueStreams extracts unit-level data <- THIS TOOL
 * 3. Output: RevenueStream[] ready for other_branch
 */

import { tool, generateObject } from "ai";
import { getModel, AI_CONFIG } from "../config";
import {
  getRevenueStreamSystemPrompt,
  buildRevenueStreamPrompt,
} from "../prompts/revenue-stream-prompt";
import type {
  RevenueStreamExtractionResult,
  RevenueStream,
  RevenueRow,
} from "../../types/revenue-stream";
import {
  extractRevenueStreamsInputSchema,
  extractRevenueStreamsOutputSchema,
  type ExtractRevenueStreamsInput,
} from "./revenue-stream-types";

/**
 * Document size threshold for complex model (characters)
 */
const COMPLEX_THRESHOLD = 10000;

/**
 * Generate UUID (compatible with browser/Node)
 */
function generateId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

/**
 * Post-process extracted streams to ensure consistency
 */
function postProcessStreams(rawStreams: RevenueStream[]): RevenueStream[] {
  return rawStreams.map((stream, streamIndex) => {
    // Ensure stream has an ID
    const streamId = stream.id || generateId("stream", streamIndex);

    // Process rows to ensure IDs
    const rows: RevenueRow[] = stream.rows.map((row, rowIndex) => {
      const rowId = row.id || generateId(`${streamId}-row`, rowIndex);

      return {
        ...row,
        id: rowId,
        // Ensure isVacant is set correctly
        isVacant: row.isVacant ?? (row.monthlyRate === null && row.annualIncome === null),
      };
    });

    return {
      ...stream,
      id: streamId,
      order: stream.order || streamIndex + 1,
      rows,
    };
  });
}

/**
 * Execute revenue stream extraction
 *
 * Standalone function for direct invocation (used by agent).
 * Extracts rent roll data into categorized RevenueStream[] format.
 */
export async function executeRevenueStreamExtraction(
  input: ExtractRevenueStreamsInput
): Promise<RevenueStreamExtractionResult> {
  const { rawText, structuredData, fileName, documentTypeHint, propertyTypeHint } = input;

  try {
    // Handle empty input
    if (!rawText || rawText.trim().length === 0) {
      return {
        success: true,
        revenueStreams: [],
        overallConfidence: 0,
        reasoning: "No content to extract from document",
        warnings: ["Document appears to be empty"],
      };
    }

    // Build prompts
    const systemPrompt = getRevenueStreamSystemPrompt();
    let userPrompt = buildRevenueStreamPrompt(rawText, fileName, propertyTypeHint);

    // Add structured data context if available (Excel/CSV provide this)
    if (structuredData) {
      userPrompt += `\n\n**Structured Data (JSON):**\n\`\`\`json\n${JSON.stringify(structuredData, null, 2)}\n\`\`\``;
    }

    // Add document type context
    if (documentTypeHint && documentTypeHint !== "unknown") {
      userPrompt += `\n\n**Document Type:** ${documentTypeHint.replace("_", " ")}`;
    }

    // Select model based on complexity
    const complexity = rawText.length > COMPLEX_THRESHOLD ? "complex" : "standard";
    const model = getModel(complexity);

    // Use generateObject for structured extraction with Zod validation
    const { object: extraction } = await generateObject({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any, // Type compatibility with AI SDK versions
      schema: extractRevenueStreamsOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: AI_CONFIG.temperature,
    });

    // Post-process to ensure consistency
    const revenueStreams = postProcessStreams(extraction.revenueStreams);

    return {
      success: true,
      revenueStreams,
      overallConfidence: extraction.overallConfidence,
      reasoning: extraction.reasoning,
      warnings: extraction.warnings,
    };
  } catch (error) {
    // Return structured error, never throw
    const errorMessage = error instanceof Error ? error.message : "Unknown extraction error";

    return {
      success: false,
      revenueStreams: [],
      overallConfidence: 0,
      reasoning: "",
      error: `Revenue stream extraction failed: ${errorMessage}`,
    };
  }
}

/**
 * Extract Revenue Streams Tool
 *
 * Wraps executeRevenueStreamExtraction for AI SDK tool usage.
 */
export const extractRevenueStreams = tool({
  description: `Extract revenue data from rent roll documents into RevenueStream[] format.

Call this tool with parsed document content to extract unit-level revenue data.

Returns:
- RevenueStream[]: Categorized streams (Residential/Commercial/Miscellaneous)
- Each stream contains RevenueRow[] with unit, sqft, rent data
- Confidence scores and extraction reasoning

Best practices:
- Include rawText from parser output
- Include structuredData if available (Excel/CSV)
- Provide propertyTypeHint when known (improves categorization)`,

  inputSchema: extractRevenueStreamsInputSchema,

  execute: executeRevenueStreamExtraction,
});
