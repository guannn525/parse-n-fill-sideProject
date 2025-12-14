/**
 * AI Configuration Module
 *
 * Configures Claude models via Vercel AI SDK for financial document parsing.
 * Provides model selection based on document complexity.
 */

import { anthropic } from "@ai-sdk/anthropic";

/**
 * Model identifiers for Claude API
 */
const MODEL_IDS = {
  SONNET_4_5: "claude-sonnet-4-20250514",
  OPUS_4_5: "claude-opus-4-5-20251101",
} as const;

/**
 * Validates that ANTHROPIC_API_KEY is present in environment
 * @throws {Error} If API key is missing
 */
function validateApiKey(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required. " +
      "Please set it in your .env file or environment configuration."
    );
  }
}

/**
 * Gets the model ID from environment or defaults to Sonnet 4.5
 */
function getModelId(): string {
  return process.env.CLAUDE_MODEL || MODEL_IDS.SONNET_4_5;
}

/**
 * AI configuration constants for the parsing agent
 */
export const AI_CONFIG = {
  /**
   * Maximum number of agent steps (tool calls + reasoning)
   * Prevents infinite loops while allowing multi-step reasoning
   */
  maxSteps: 5,

  /**
   * Temperature for generation (0.0 - 1.0)
   * Lower values = more deterministic/reliable
   * Higher values = more creative/variable
   */
  temperature: 0.3,

  /**
   * Default model for standard documents
   * Claude Sonnet 4.5 - Fast, cost-effective, handles most documents
   */
  defaultModel: MODEL_IDS.SONNET_4_5,

  /**
   * Complex model for challenging documents
   * Claude Opus 4.5 - Most capable, use for complex financial statements
   */
  complexModel: MODEL_IDS.OPUS_4_5,
} as const;

/**
 * Default AI model instance configured with Sonnet 4.5
 * Validates API key on initialization
 *
 * @example
 * ```typescript
 * import { generateText } from "ai";
 * import { aiModel } from "./ai/config";
 *
 * const result = await generateText({
 *   model: aiModel,
 *   prompt: "Analyze this financial document..."
 * });
 * ```
 */
export const aiModel = (() => {
  validateApiKey();
  return anthropic(getModelId());
})();

/**
 * Complexity levels for document parsing
 */
export type DocumentComplexity = "standard" | "complex";

/**
 * Gets the appropriate AI model based on document complexity
 *
 * @param complexity - Document complexity level
 * @returns Configured Anthropic model instance
 *
 * @example
 * ```typescript
 * // For simple P&L statements
 * const model = getModel("standard");
 *
 * // For complex multi-property consolidations
 * const model = getModel("complex");
 *
 * const result = await generateText({
 *   model,
 *   prompt: "Extract financial data..."
 * });
 * ```
 */
export function getModel(complexity: DocumentComplexity) {
  validateApiKey();

  const modelId = complexity === "complex"
    ? AI_CONFIG.complexModel
    : AI_CONFIG.defaultModel;

  return anthropic(modelId);
}

/**
 * Re-export model IDs for testing and documentation
 */
export { MODEL_IDS };
