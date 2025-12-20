/**
 * Image Parser Tests
 *
 * Tests Claude vision-based OCR for image parsing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { imageParser } from "./image-parser";
import { ParseError } from "../lib/errors";
import type { ParserInput } from "./types";

// Mock the ai module
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock the AI config
vi.mock("../ai/config", () => ({
  aiModel: "mocked-model",
  AI_CONFIG: {
    temperature: 0.3,
  },
}));

// Import after mocking
import { generateText } from "ai";

describe("imageParser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("supportedTypes", () => {
    it("should support PNG, JPEG, and WebP images", () => {
      expect(imageParser.supportedTypes).toEqual(["image/png", "image/jpeg", "image/webp"]);
    });
  });

  describe("parse", () => {
    it("should successfully extract text from an image", async () => {
      // Mock successful Claude API response
      const mockText = `Financial Statement

| Category | Amount |
|----------|--------|
| Revenue  | $100,000 |
| Expenses | $50,000 |
| Net Income | $50,000 |`;

      vi.mocked(generateText).mockResolvedValue({
        text: mockText,
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("fake-image-data"),
        fileName: "financial-statement.png",
        mimeType: "image/png",
      };

      const result = await imageParser.parse(input);

      // Verify result structure
      expect(result.rawText).toBe(mockText);
      expect(result.metadata.pageCount).toBe(1);

      // Verify generateText was called with correct parameters
      expect(generateText).toHaveBeenCalledWith({
        model: "mocked-model",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: expect.stringContaining("Extract all text and data"),
              },
              {
                type: "image",
                image: expect.stringMatching(/^data:image\/png;base64,/),
              },
            ],
          },
        ],
        maxOutputTokens: 4000,
        temperature: 0.3,
      });
    });

    it("should construct proper base64 data URL", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: "Mock response",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      } as any);

      const testBuffer = Buffer.from("test-image-data");
      const input: ParserInput = {
        fileBuffer: testBuffer,
        fileName: "test.jpeg",
        mimeType: "image/jpeg",
      };

      await imageParser.parse(input);

      const expectedBase64 = testBuffer.toString("base64");
      const expectedDataUrl = `data:image/jpeg;base64,${expectedBase64}`;

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              role: "user",
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: "image",
                  image: expectedDataUrl,
                }),
              ]),
            },
          ],
        })
      );
    });

    it("should handle API errors with context", async () => {
      // Mock API error
      const apiError = new Error("API rate limit exceeded");
      vi.mocked(generateText).mockRejectedValue(apiError);

      const input: ParserInput = {
        fileBuffer: Buffer.from("fake-image-data"),
        fileName: "test.png",
        mimeType: "image/png",
      };

      await expect(imageParser.parse(input)).rejects.toThrow(ParseError);

      try {
        await imageParser.parse(input);
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        if (error instanceof ParseError) {
          expect(error.message).toContain("Failed to parse image with Gemini vision");
          expect(error.message).toContain("API rate limit exceeded");
          expect(error.context).toEqual({
            fileName: "test.png",
            mimeType: "image/png",
            fileSize: input.fileBuffer.length,
            error: "API rate limit exceeded",
          });
        }
      }
    });

    it("should handle non-Error exceptions", async () => {
      // Mock non-Error exception
      vi.mocked(generateText).mockRejectedValue("String error");

      const input: ParserInput = {
        fileBuffer: Buffer.from("fake-image-data"),
        fileName: "test.webp",
        mimeType: "image/webp",
      };

      await expect(imageParser.parse(input)).rejects.toThrow(ParseError);

      try {
        await imageParser.parse(input);
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        if (error instanceof ParseError) {
          expect(error.message).toContain("Unknown error");
          expect(error.context?.error).toBe("Unknown error");
        }
      }
    });

    it("should include financial-focused prompt", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: "Mock response",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("fake-image-data"),
        fileName: "income-statement.png",
        mimeType: "image/png",
      };

      await imageParser.parse(input);

      const call = vi.mocked(generateText).mock.calls[0][0];
      const textContent = call.messages[0].content[0];

      expect(textContent.type).toBe("text");
      if (textContent.type === "text") {
        expect(textContent.text).toContain("financial line items");
        expect(textContent.text).toContain("revenue");
        expect(textContent.text).toContain("expenses");
        expect(textContent.text).toContain("totals");
        expect(textContent.text).toContain("markdown table format");
      }
    });

    it("should set pageCount to 1 for images", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: "Mock response",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      } as any);

      const input: ParserInput = {
        fileBuffer: Buffer.from("fake-image-data"),
        fileName: "test.png",
        mimeType: "image/png",
      };

      const result = await imageParser.parse(input);

      expect(result.metadata.pageCount).toBe(1);
    });

    it("should work with different image formats", async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: "Mock response",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      } as any);

      const formats: Array<{ mimeType: "image/png" | "image/jpeg" | "image/webp"; ext: string }> = [
        { mimeType: "image/png", ext: "png" },
        { mimeType: "image/jpeg", ext: "jpeg" },
        { mimeType: "image/webp", ext: "webp" },
      ];

      for (const format of formats) {
        vi.clearAllMocks();

        const input: ParserInput = {
          fileBuffer: Buffer.from("fake-image-data"),
          fileName: `test.${format.ext}`,
          mimeType: format.mimeType,
        };

        const result = await imageParser.parse(input);

        expect(result.rawText).toBe("Mock response");
        expect(result.metadata.pageCount).toBe(1);

        const call = vi.mocked(generateText).mock.calls[0][0];
        const imageContent = call.messages[0].content[1];

        if (imageContent.type === "image") {
          expect(imageContent.image).toMatch(new RegExp(`^data:${format.mimeType};base64,`));
        }
      }
    });
  });
});
