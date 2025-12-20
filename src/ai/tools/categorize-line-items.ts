/**
 * Tool: categorizeLineItems
 *
 * Categorizes extracted financial line items into revenue, expenses, or adjustments.
 * Provides reasoning for each categorization decision for audit trail.
 *
 * Workflow:
 * 1. extractFinancialData extracts line items
 * 2. categorizeLineItems categorizes them <- YOU ARE HERE
 * 3. Agent assembles DirectCapitalizationRateModel
 *
 * Use Cases:
 * - "Categorize these line items into revenue and expenses"
 * - "Determine which items are one-time adjustments"
 * - "Classify the extracted data for the cap rate model"
 */

import { tool, generateObject, type LanguageModel } from "ai";
import { getModel, AI_CONFIG } from "../config";
import {
  getCategorizationSystemPrompt,
  buildCategorizationPrompt,
  type LineItem,
} from "../prompts/categorization-prompt";
import type {
  CategorizationResult,
  CategorizedLineItem,
  FinancialCategory,
  CategorizationInput,
} from "./types";
import { categorizationInputSchema, categorizationOutputSchema } from "./types";

/**
 * Normalize a label to camelCase key
 *
 * @param str - Label string to normalize
 * @returns camelCase key
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Categorize line items tool
 *
 * Uses Claude to categorize extracted financial line items into
 * revenue, expenses, or adjustments based on commercial real estate
 * appraisal standards.
 */
export const categorizeLineItems = tool({
  description: `Categorize extracted financial line items into revenue, expenses, or adjustments.

Call this after extractFinancialData to categorize the extracted items.
Returns categorized items with:
- Category (revenue, expense, adjustment)
- Subcategory for detailed classification
- Normalized camelCase keys for output JSON
- Categorization reasoning for audit trail
- Flags for items needing review

Custom mappings can override AI categorization for specific labels.`,

  inputSchema: categorizationInputSchema,

  execute: async (input: CategorizationInput): Promise<CategorizationResult> => {
    const { lineItems, customMappings } = input;

    try {
      // Handle empty input
      if (!lineItems || lineItems.length === 0) {
        return {
          success: true,
          categorizedItems: [],
          summary: { revenueCount: 0, expenseCount: 0, adjustmentCount: 0 },
          reasoning: "No items to categorize",
          flaggedForReview: [],
        };
      }

      // Convert to LineItem format for the prompt
      const promptLineItems: LineItem[] = lineItems.map((item) => ({
        label: item.label,
        value: item.annualizedValue,
        context: item.context,
      }));

      // Build categorization prompt using existing prompt functions
      const systemPrompt = getCategorizationSystemPrompt();
      let userPrompt = buildCategorizationPrompt(promptLineItems);

      // Add custom mappings context if provided
      if (customMappings && Object.keys(customMappings).length > 0) {
        userPrompt += `\n\n**Custom Category Mappings (these override AI decisions):**\n`;
        for (const [label, category] of Object.entries(customMappings)) {
          userPrompt += `- "${label}" → ${category}\n`;
        }
      }

      const model = getModel("standard");

      // Use generateObject for structured categorization with Zod validation
      const { object: categorization } = await generateObject({
        model: model as unknown as LanguageModel, // Type compatibility: LanguageModelV1 -> LanguageModel
        schema: categorizationOutputSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: AI_CONFIG.temperature,
      });

      // Merge with original extraction data and apply custom mappings
      const categorizedItems: CategorizedLineItem[] = categorization.categorizedItems.map(
        (catItem) => {
          // Find original item to preserve extraction metadata
          const original = lineItems.find((li) => li.label === catItem.label);

          // Apply custom mapping if exists (overrides AI decision)
          let finalCategory = catItem.category as FinancialCategory;
          if (customMappings && customMappings[catItem.label]) {
            finalCategory = customMappings[catItem.label] as FinancialCategory;
          }

          return {
            // Preserve original extraction data
            label: catItem.label,
            value: catItem.value,
            confidence: original?.confidence ?? 0.5,
            originalPeriod: original?.originalPeriod ?? "unknown",
            annualizedValue: catItem.annualizedValue,
            context: original?.context,
            reasoning: original?.reasoning ?? "",
            // Add categorization data
            category: finalCategory,
            subcategory: catItem.subcategory,
            normalizedKey: catItem.normalizedKey || toCamelCase(catItem.label),
            categorizationReasoning: catItem.categorizationReasoning,
            flags: catItem.flags,
          };
        }
      );

      // Separate items flagged for review
      const flaggedForReview = categorizedItems.filter(
        (item) => item.flags && item.flags.length > 0
      );

      // Calculate summary counts
      const summary = {
        revenueCount: categorizedItems.filter((i) => i.category === "revenue").length,
        expenseCount: categorizedItems.filter((i) => i.category === "expense").length,
        adjustmentCount: categorizedItems.filter((i) => i.category === "adjustment").length,
      };

      return {
        success: true,
        categorizedItems,
        summary,
        reasoning: categorization.reasoning,
        flaggedForReview,
      };
    } catch (error) {
      // Return structured error, never throw
      const errorMessage = error instanceof Error ? error.message : "Unknown categorization error";

      return {
        success: false,
        categorizedItems: [],
        summary: { revenueCount: 0, expenseCount: 0, adjustmentCount: 0 },
        reasoning: "",
        flaggedForReview: [],
        error: `Categorization failed: ${errorMessage}`,
      };
    }
  },
});
