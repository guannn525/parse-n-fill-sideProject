/**
 * Image Parser
 *
 * Parses image files (PNG, JPEG, WebP) using Gemini vision for OCR and document understanding.
 * Optimized for financial documents with table structure preservation.
 */

import { generateText } from "ai";
import { aiModel, AI_CONFIG } from "../ai/config";
import { ParseError } from "../lib/errors";
import type { FileParser, ParsedContent, ParserInput } from "./types";

/**
 * OCR prompt optimized for financial documents
 * Focuses on extracting revenue, expenses, and maintaining table structure
 */
const OCR_PROMPT = `Extract all text and data from this image document.

Instructions:
- Extract ALL visible text content
- Preserve table structures using markdown table format
- Identify and label financial line items (revenue, expenses, adjustments)
- Note any totals, subtotals, or calculated values
- Maintain the original formatting and structure
- If the image contains forms or labels, include field names and values
- For currency values, preserve formatting (dollar signs, commas, decimals)

Focus on:
- Revenue items (income, rent, fees, etc.)
- Operating expenses (utilities, maintenance, payroll, etc.)
- One-time adjustments or non-recurring items
- Summary totals and subtotals

Return the extracted content in a clear, structured format that preserves the document's organization.`;

/**
 * Image parser implementation using Gemini vision
 */
export const imageParser: FileParser = {
  supportedTypes: ["image/png", "image/jpeg", "image/webp"] as const,

  async parse(input: ParserInput): Promise<ParsedContent> {
    const { fileBuffer, fileName, mimeType } = input;

    try {
      // Convert buffer to base64 data URL for Gemini API
      const base64 = fileBuffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Call Gemini with vision message
      const result = await generateText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: aiModel as any, // Type compatibility with AI SDK versions
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: OCR_PROMPT,
              },
              {
                type: "image",
                image: dataUrl,
              },
            ],
          },
        ],
        maxOutputTokens: 4000,
        temperature: AI_CONFIG.temperature,
      });

      // Return parsed content with metadata
      return {
        rawText: result.text,
        metadata: {
          pageCount: 1, // Images are single page
        },
      };
    } catch (error) {
      // Handle API errors with context
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      throw new ParseError(`Failed to parse image with Gemini vision: ${errorMessage}`, {
        fileName,
        mimeType,
        fileSize: fileBuffer.length,
        error: errorMessage,
      });
    }
  },
};
