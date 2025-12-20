/**
 * Tool: extractFinancialData
 *
 * Extracts financial line items from parsed document content using Claude AI.
 * Returns structured line items with confidence scores for audit trail.
 *
 * Workflow:
 * 1. Parser outputs ParsedContent (Phase 2)
 * 2. extractFinancialData extracts line items <- YOU ARE HERE
 * 3. categorizeLineItems categorizes into revenue/expense/adjustment
 *
 * Use Cases:
 * - "Extract financial data from this rent roll"
 * - "Parse the operating statement and identify line items"
 * - "Get revenue and expense items from this P&L"
 */

import { tool, generateObject, type LanguageModel } from "ai";
import { getModel, AI_CONFIG } from "../config";
import { getExtractionSystemPrompt, buildExtractionPrompt } from "../prompts/extraction-prompt";
import type { ExtractionResult, ExtractedLineItem, TimePeriod, ExtractionInput } from "./types";
import { extractionInputSchema, extractionOutputSchema } from "./types";

/**
 * Threshold for switching to complex model (characters)
 */
const COMPLEX_THRESHOLD = 10000;

/**
 * Extract financial data tool
 *
 * Uses Claude to identify and extract financial line items from parsed document content.
 * Returns structured data with confidence scores for each item.
 */
export const extractFinancialData = tool({
  description: `Extract financial line items from parsed document content.

Call this tool with the output from file parsers (PDF, Excel, CSV, Image).
Returns structured line items with:
- Labels and values
- Confidence scores (0-1)
- Time period detection and annualization
- Extraction reasoning for audit trail

Best practices:
- Include rawText from parser output
- Include structuredData if available (Excel/CSV)
- Provide documentTypeHint when known (improves accuracy)`,

  inputSchema: extractionInputSchema,

  execute: async (input: ExtractionInput): Promise<ExtractionResult> => {
    const { rawText, structuredData, fileName, documentTypeHint } = input;

    try {
      // Build the extraction prompt using existing prompt functions
      const systemPrompt = getExtractionSystemPrompt();
      let userPrompt = buildExtractionPrompt(rawText, fileName);

      // Add structured data context if available (Excel/CSV provide this)
      if (structuredData) {
        userPrompt += `\n\n**Structured Data (JSON):**\n\`\`\`json\n${JSON.stringify(structuredData, null, 2)}\n\`\`\``;
      }

      // Add document type hint if provided
      if (documentTypeHint && documentTypeHint !== "unknown") {
        userPrompt += `\n\n**Document Type Hint:** ${documentTypeHint}`;
      }

      // Determine model complexity based on document size
      const complexity = rawText.length > COMPLEX_THRESHOLD ? "complex" : "standard";
      const model = getModel(complexity);

      // Use generateObject for structured extraction with Zod validation
      const { object: extraction } = await generateObject({
        model: model as unknown as LanguageModel, // Type compatibility: LanguageModelV1 -> LanguageModel
        schema: extractionOutputSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: AI_CONFIG.temperature,
      });

      // Validate and normalize results
      const lineItems: ExtractedLineItem[] = extraction.lineItems.map((item) => ({
        ...item,
        originalPeriod: item.originalPeriod as TimePeriod,
      }));

      return {
        success: true,
        lineItems,
        overallConfidence: extraction.overallConfidence,
        reasoning: extraction.reasoning,
        warnings: extraction.warnings,
      };
    } catch (error) {
      // Return structured error, never throw
      const errorMessage = error instanceof Error ? error.message : "Unknown extraction error";

      return {
        success: false,
        lineItems: [],
        overallConfidence: 0,
        reasoning: "",
        error: `Extraction failed: ${errorMessage}`,
      };
    }
  },
});
