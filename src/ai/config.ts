/**
 * AI Configuration Module
 *
 * Configures Gemini models via Vercel AI SDK for financial document parsing.
 * Provides model selection based on document complexity.
 */

import { google } from "@ai-sdk/google";

/**
 * Model identifiers for Gemini API
 */
const MODEL_IDS = {
  FLASH: "gemini-3-flash-preview",
  PRO: "gemini-2.0-pro-exp",
} as const;

/**
 * Validates that GOOGLE_GENERATIVE_AI_API_KEY is present in environment
 * @throws {Error} If API key is missing
 */
function validateApiKey(): void {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY environment variable is required. " +
        "Please set it in your .env file or environment configuration."
    );
  }
}

/**
 * Gets the model ID from environment or defaults to Gemini Flash
 */
function getModelId(): string {
  return process.env.GEMINI_MODEL || MODEL_IDS.FLASH;
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
   * Gemini Flash 2.0 - Fast, cost-effective, handles most documents
   */
  defaultModel: MODEL_IDS.FLASH,

  /**
   * Complex model for challenging documents
   * Gemini Pro 2.0 - Most capable, use for complex financial statements
   */
  complexModel: MODEL_IDS.PRO,
} as const;

/**
 * Default AI model instance configured with Gemini Flash
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
  return google(getModelId());
})();

/**
 * Complexity levels for document parsing
 */
export type DocumentComplexity = "standard" | "complex";

/**
 * Gets the appropriate AI model based on document complexity
 *
 * @param complexity - Document complexity level
 * @returns Configured Gemini model instance
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

  const modelId = complexity === "complex" ? AI_CONFIG.complexModel : AI_CONFIG.defaultModel;

  return google(modelId);
}

/**
 * Re-export model IDs for testing and documentation
 */
export { MODEL_IDS };
