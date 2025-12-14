/**
 * PDF Parser Tests
 *
 * Tests for PDF document parsing using Claude vision API.
 * Uses mocked AI responses to test parsing logic without actual API calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { pdfParser } from "./pdf-parser";
import { ParseError } from "../lib/errors";
import type { ParserInput } from "./types";

// Mock the AI module
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock the AI config module
vi.mock("../ai/config", () => ({
  aiModel: { id: "mock-model" },
  AI_CONFIG: {
    temperature: 0.3,
    maxSteps: 5,
  },
}));

describe("pdfParser", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe("supportedTypes", () => {
    it("should support application/pdf MIME type", () => {
      expect(pdfParser.supportedTypes).toEqual(["application/pdf"]);
    });
  });

  describe("parse", () => {
    it("should successfully parse PDF and extract text content", async () => {
      // Arrange
      const mockExtractedText = `# Financial Statement Q4 2024

## Revenue
| Category | Amount |
|----------|--------|
| Rental Income | $50,000 |
| Parking Fees | $2,500 |
| Late Fees | $500 |
| **Total Revenue** | **$53,000** |

## Expenses
| Category | Amount |
|----------|--------|
| Property Tax | $8,000 |
| Insurance | $3,500 |
| Maintenance | $4,200 |
| Utilities | $2,800 |
| **Total Expenses** | **$18,500** |

**Net Operating Income**: $34,500`;

      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValue({
        text: mockExtractedText,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf-content"),
        fileName: "financial-statement.pdf",
        mimeType: "application/pdf",
      };

      // Act
      const result = await pdfParser.parse(input);

      // Assert
      expect(result.rawText).toBe(mockExtractedText);
      expect(result.metadata.fileSizeBytes).toBe(input.fileBuffer.length);
      expect(result.metadata.pageCount).toBeGreaterThan(0);
      expect(result.metadata.parsingDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should correctly estimate page count based on content length", async () => {
      // Arrange - Create text that simulates ~2.5 pages (7500 chars)
      const mockText = "A".repeat(7500);

      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValue({
        text: mockText,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf-content"),
        fileName: "long-document.pdf",
        mimeType: "application/pdf",
      };

      // Act
      const result = await pdfParser.parse(input);

      // Assert - Should round up to 3 pages (7500 / 3000 = 2.5 -> 3)
      expect(result.metadata.pageCount).toBe(3);
    });

    it("should set minimum page count to 1 for short documents", async () => {
      // Arrange - Very short content
      const mockText = "Short document with minimal content.";

      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValue({
        text: mockText,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf-content"),
        fileName: "short.pdf",
        mimeType: "application/pdf",
      };

      // Act
      const result = await pdfParser.parse(input);

      // Assert - Should have at least 1 page
      expect(result.metadata.pageCount).toBe(1);
    });

    it("should construct correct base64 data URL", async () => {
      // Arrange
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValue({
        text: "Extracted content",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200 },
      } as any);

      const pdfContent = Buffer.from("test-pdf-binary-data");
      const input: ParserInput = {
        fileBuffer: pdfContent,
        fileName: "test.pdf",
        mimeType: "application/pdf",
      };

      // Act
      await pdfParser.parse(input);

      // Assert - Check that generateText was called with correct data URL format
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({ type: "text" }),
                expect.objectContaining({
                  type: "image",
                  image: expect.stringMatching(/^data:application\/pdf;base64,/),
                }),
              ]),
            }),
          ],
        })
      );
    });

    it("should use correct AI configuration parameters", async () => {
      // Arrange
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValue({
        text: "Extracted content",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf"),
        fileName: "test.pdf",
        mimeType: "application/pdf",
      };

      // Act
      await pdfParser.parse(input);

      // Assert
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxOutputTokens: 8000,
          temperature: 0.3,
        })
      );
    });

    it("should throw ParseError when PDF parsing returns empty content", async () => {
      // Arrange
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValue({
        text: "",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 0 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf"),
        fileName: "empty.pdf",
        mimeType: "application/pdf",
      };

      // Act & Assert
      await expect(pdfParser.parse(input)).rejects.toThrow(ParseError);
      await expect(pdfParser.parse(input)).rejects.toThrow(
        "PDF parsing returned empty content"
      );
    });

    it("should throw ParseError with whitespace-only content", async () => {
      // Arrange
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValue({
        text: "   \n\t  \n  ",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 5 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf"),
        fileName: "whitespace.pdf",
        mimeType: "application/pdf",
      };

      // Act & Assert
      await expect(pdfParser.parse(input)).rejects.toThrow(ParseError);
    });

    it("should wrap API errors with ParseError and include context", async () => {
      // Arrange
      const { generateText } = await import("ai");
      const mockApiError = new Error("API rate limit exceeded");
      vi.mocked(generateText).mockRejectedValue(mockApiError);

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf"),
        fileName: "error.pdf",
        mimeType: "application/pdf",
      };

      // Act & Assert
      await expect(pdfParser.parse(input)).rejects.toThrow(ParseError);

      try {
        await pdfParser.parse(input);
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        if (error instanceof ParseError) {
          expect(error.message).toContain("Failed to parse PDF document");
          expect(error.message).toContain("API rate limit exceeded");
          expect(error.context).toMatchObject({
            fileName: "error.pdf",
            fileSizeBytes: input.fileBuffer.length,
            originalError: "API rate limit exceeded",
          });
        }
      }
    });

    it("should handle non-Error exceptions", async () => {
      // Arrange
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockRejectedValue("String error message");

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf"),
        fileName: "error.pdf",
        mimeType: "application/pdf",
      };

      // Act & Assert
      await expect(pdfParser.parse(input)).rejects.toThrow(ParseError);

      try {
        await pdfParser.parse(input);
      } catch (error) {
        if (error instanceof ParseError) {
          expect(error.message).toContain("String error message");
        }
      }
    });

    it("should re-throw ParseError instances without wrapping", async () => {
      // Arrange
      const { generateText } = await import("ai");
      const originalError = new ParseError("Original parse error", { detail: "test" });
      vi.mocked(generateText).mockRejectedValue(originalError);

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf"),
        fileName: "error.pdf",
        mimeType: "application/pdf",
      };

      // Act & Assert
      await expect(pdfParser.parse(input)).rejects.toThrow(originalError);
    });

    it("should include parsing duration in metadata", async () => {
      // Arrange
      const { generateText } = await import("ai");

      // Simulate API delay
      vi.mocked(generateText).mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              text: "Delayed content",
              finishReason: "stop",
              usage: { promptTokens: 100, completionTokens: 50 },
            } as any);
          }, 100);
        })
      );

      const input: ParserInput = {
        fileBuffer: Buffer.from("mock-pdf"),
        fileName: "timed.pdf",
        mimeType: "application/pdf",
      };

      // Act
      const result = await pdfParser.parse(input);

      // Assert - Should have measured parsing duration
      expect(result.metadata.parsingDurationMs).toBeGreaterThanOrEqual(100);
      expect(result.metadata.parsingDurationMs).toBeLessThan(1000);
    });
  });
});
