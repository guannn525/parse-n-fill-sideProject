/**
 * PDF Parser Module
 *
 * Parses PDF documents using Claude vision API to extract text and financial data.
 * Converts PDF buffer to base64 data URL and uses Claude's multimodal capabilities
 * to extract structured content.
 */

import { generateText } from "ai";
import { aiModel, AI_CONFIG } from "../ai/config";
import { ParseError } from "../lib/errors";
import type { FileParser, ParserInput, ParsedContent } from "./types";

/**
 * System prompt for PDF financial document extraction
 *
 * Instructs Claude to preserve structure and extract financial information
 * in a format suitable for downstream processing.
 */
const PDF_EXTRACTION_PROMPT = `You are a financial document parser. Extract all text content from this PDF document with the following requirements:

1. **Preserve Document Structure**:
   - Maintain headings, sections, and hierarchy
   - Keep paragraphs intact
   - Preserve list formatting (bullets, numbers)

2. **Extract Tables**:
   - Convert all tables to markdown format
   - Use | for column separators
   - Include headers with alignment row (|---|---|)
   - Preserve numeric formatting (decimals, currency symbols)

3. **Identify Financial Data**:
   - Revenue items (income, sales, rent, fees)
   - Expense items (operating costs, utilities, maintenance, taxes)
   - Totals and subtotals
   - Any one-time or non-recurring items

4. **Additional Context**:
   - Note page numbers if visible
   - Preserve date information
   - Include any footnotes or annotations

5. **Output Format**:
   - Return clean, readable text
   - Use clear section separators
   - Make financial data easy to identify

Extract ALL text content from the document. Be thorough and accurate.`;

/**
 * PDF Parser Implementation
 *
 * Uses Claude vision API to extract text and structured data from PDF documents.
 * Supports financial document parsing with emphasis on tables and numeric data.
 *
 * @example
 * ```typescript
 * const parser = pdfParser;
 * const result = await parser.parse({
 *   fileBuffer: pdfBuffer,
 *   fileName: "financial-statement.pdf",
 *   mimeType: "application/pdf"
 * });
 *
 * console.log(result.rawText); // Extracted text content
 * console.log(result.metadata.pageCount); // Estimated page count
 * ```
 */
export const pdfParser: FileParser = {
  supportedTypes: ["application/pdf"],

  async parse(input: ParserInput): Promise<ParsedContent> {
    const startTime = Date.now();

    try {
      // Convert PDF buffer to base64 data URL for Claude vision
      const base64 = input.fileBuffer.toString("base64");
      const dataUrl = `data:application/pdf;base64,${base64}`;

      // Call Claude with vision message to extract text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await generateText({
        model: aiModel as any, // Type compatibility with AI SDK versions
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PDF_EXTRACTION_PROMPT },
              { type: "image", image: dataUrl },
            ],
          },
        ],
        maxOutputTokens: 8000, // Higher for PDFs (more content)
        temperature: AI_CONFIG.temperature,
      });

      const rawText = result.text;

      // Validate that we got meaningful content
      if (!rawText || rawText.trim().length === 0) {
        throw new ParseError("PDF parsing returned empty content", {
          fileName: input.fileName,
          fileSizeBytes: input.fileBuffer.length,
        });
      }

      // Estimate page count from content length
      // Average page ~3000 characters for text-heavy documents
      const estimatedPages = Math.max(1, Math.ceil(rawText.length / 3000));

      const parsingDurationMs = Date.now() - startTime;

      return {
        rawText,
        metadata: {
          pageCount: estimatedPages,
          fileSizeBytes: input.fileBuffer.length,
          parsingDurationMs,
        },
      };
    } catch (error) {
      // Handle API errors
      if (error instanceof ParseError) {
        throw error; // Re-throw our own errors
      }

      // Wrap external errors with context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ParseError(
        `Failed to parse PDF document: ${errorMessage}`,
        {
          fileName: input.fileName,
          fileSizeBytes: input.fileBuffer.length,
          originalError: errorMessage,
        }
      );
    }
  },
};
