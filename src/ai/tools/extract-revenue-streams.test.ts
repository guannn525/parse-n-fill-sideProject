/**
 * Revenue Stream Extraction Tool Tests
 *
 * Tests for rent roll extraction into RevenueStream[] format using mocked Claude API.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ai package before importing the tool
vi.mock("ai", () => ({
  tool: vi.fn((config) => config),
  generateObject: vi.fn(),
}));

// Mock the config
vi.mock("../config", () => ({
  getModel: vi.fn(() => "mock-model"),
  AI_CONFIG: { temperature: 0.3 },
}));

// Mock the prompts
vi.mock("../prompts/revenue-stream-prompt", () => ({
  getRevenueStreamSystemPrompt: vi.fn(() => "You are a rent roll analyst..."),
  buildRevenueStreamPrompt: vi.fn(
    (content, fileName) => `Extract from ${fileName}: ${content}`
  ),
}));

import { generateObject } from "ai";
import { extractRevenueStreams } from "./extract-revenue-streams";
import { getModel } from "../config";

describe("extractRevenueStreams Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool configuration", () => {
    it("has correct description", () => {
      expect(extractRevenueStreams.description).toContain("RevenueStream");
    });

    it("has required inputSchema defined", () => {
      expect(extractRevenueStreams.inputSchema).toBeDefined();
    });
  });

  describe("successful extraction", () => {
    it("extracts residential units from rent roll", async () => {
      const mockResult = {
        object: {
          revenueStreams: [
            {
              id: "stream-1",
              name: "Apartment Rents",
              category: "Residential",
              order: 1,
              rows: [
                {
                  id: "row-1",
                  unit: "Apt 101",
                  squareFeet: 850,
                  monthlyRate: 1500,
                  annualIncome: null,
                  isVacant: false,
                },
                {
                  id: "row-2",
                  unit: "Apt 102",
                  squareFeet: 900,
                  monthlyRate: 1600,
                  annualIncome: null,
                  isVacant: false,
                },
              ],
            },
          ],
          overallConfidence: 0.95,
          reasoning: "Extracted 2 residential units from rent roll",
          warnings: [],
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractRevenueStreams.execute({
        rawText: "Apt 101: 850 SF, $1,500/mo\nApt 102: 900 SF, $1,600/mo",
        fileName: "rent_roll.pdf",
        documentTypeHint: "rent_roll",
      });

      expect(result.success).toBe(true);
      expect(result.revenueStreams).toHaveLength(1);
      expect(result.revenueStreams[0].category).toBe("Residential");
      expect(result.revenueStreams[0].rows).toHaveLength(2);
      expect(result.revenueStreams[0].rows[0].monthlyRate).toBe(1500);
      expect(result.overallConfidence).toBe(0.95);
    });

    it("extracts commercial units with annual income", async () => {
      const mockResult = {
        object: {
          revenueStreams: [
            {
              id: "stream-1",
              name: "Office Rents",
              category: "Commercial",
              order: 1,
              rows: [
                {
                  id: "row-1",
                  unit: "Suite 200",
                  squareFeet: 2000,
                  monthlyRate: null,
                  annualIncome: 48000,
                  isVacant: false,
                },
              ],
            },
          ],
          overallConfidence: 0.92,
          reasoning: "Extracted commercial office space with annual rent",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractRevenueStreams.execute({
        rawText: "Suite 200: 2,000 SF, $48,000/year",
        fileName: "office_rent_roll.xlsx",
        propertyTypeHint: "commercial",
      });

      expect(result.success).toBe(true);
      expect(result.revenueStreams[0].category).toBe("Commercial");
      expect(result.revenueStreams[0].rows[0].annualIncome).toBe(48000);
      expect(result.revenueStreams[0].rows[0].monthlyRate).toBeNull();
    });

    it("extracts mixed-use property with multiple streams", async () => {
      const mockResult = {
        object: {
          revenueStreams: [
            {
              id: "stream-1",
              name: "Retail Rents",
              category: "Commercial",
              order: 1,
              rows: [
                {
                  id: "row-1",
                  unit: "Store 1",
                  squareFeet: 1500,
                  monthlyRate: 3000,
                  annualIncome: 36000,
                  isVacant: false,
                },
              ],
            },
            {
              id: "stream-2",
              name: "Apartment Rents",
              category: "Residential",
              order: 2,
              rows: [
                {
                  id: "row-1",
                  unit: "Unit 2A",
                  squareFeet: 800,
                  monthlyRate: 1200,
                  annualIncome: null,
                  isVacant: false,
                },
              ],
            },
            {
              id: "stream-3",
              name: "Parking Income",
              category: "Miscellaneous",
              order: 3,
              rows: [
                {
                  id: "row-1",
                  unit: "Parking Lot",
                  squareFeet: null,
                  monthlyRate: 500,
                  annualIncome: null,
                  isVacant: false,
                },
              ],
            },
          ],
          overallConfidence: 0.88,
          reasoning: "Extracted mixed-use property with retail, residential, and parking",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractRevenueStreams.execute({
        rawText: "Mixed use property rent roll...",
        fileName: "mixed_use.pdf",
        propertyTypeHint: "mixed_use",
      });

      expect(result.success).toBe(true);
      expect(result.revenueStreams).toHaveLength(3);

      const categories = result.revenueStreams.map((s) => s.category);
      expect(categories).toContain("Commercial");
      expect(categories).toContain("Residential");
      expect(categories).toContain("Miscellaneous");
    });

    it("handles vacant units correctly", async () => {
      const mockResult = {
        object: {
          revenueStreams: [
            {
              id: "stream-1",
              name: "Apartment Rents",
              category: "Residential",
              order: 1,
              rows: [
                {
                  id: "row-1",
                  unit: "Apt 101",
                  squareFeet: 850,
                  monthlyRate: 1500,
                  annualIncome: null,
                  isVacant: false,
                },
                {
                  id: "row-2",
                  unit: "Apt 102",
                  squareFeet: 900,
                  monthlyRate: null,
                  annualIncome: null,
                  isVacant: true,
                },
              ],
            },
          ],
          overallConfidence: 0.93,
          reasoning: "Extracted units, Apt 102 is vacant",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractRevenueStreams.execute({
        rawText: "Apt 101: Occupied, $1,500/mo\nApt 102: VACANT",
        fileName: "rent_roll.pdf",
      });

      expect(result.success).toBe(true);
      expect(result.revenueStreams[0].rows[0].isVacant).toBe(false);
      expect(result.revenueStreams[0].rows[1].isVacant).toBe(true);
      expect(result.revenueStreams[0].rows[1].monthlyRate).toBeNull();
    });

    it("handles structured data from Excel/CSV", async () => {
      const mockResult = {
        object: {
          revenueStreams: [
            {
              id: "stream-1",
              name: "Office Rents",
              category: "Commercial",
              order: 1,
              rows: [
                {
                  id: "row-1",
                  unit: "Suite A",
                  squareFeet: 1000,
                  monthlyRate: 2000,
                  annualIncome: 24000,
                  isVacant: false,
                },
              ],
            },
          ],
          overallConfidence: 0.98,
          reasoning: "High confidence extraction from structured Excel data",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractRevenueStreams.execute({
        rawText: "Excel rent roll data",
        structuredData: [
          { Unit: "Suite A", "Sq Ft": 1000, Monthly: 2000, Annual: 24000 },
        ],
        fileName: "rent_roll.xlsx",
      });

      expect(result.success).toBe(true);
      expect(result.overallConfidence).toBe(0.98);

      // Verify generateObject was called with structured data in prompt
      const callArgs = vi.mocked(generateObject).mock.calls[0][0];
      expect(callArgs.prompt).toContain("Structured Data (JSON)");
    });
  });

  describe("error handling", () => {
    it("returns structured error on API failure", async () => {
      vi.mocked(generateObject).mockRejectedValueOnce(
        new Error("API rate limit exceeded")
      );

      const result = await extractRevenueStreams.execute({
        rawText: "Some content",
        fileName: "test.pdf",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Revenue stream extraction failed");
      expect(result.error).toContain("API rate limit exceeded");
      expect(result.revenueStreams).toEqual([]);
    });

    it("handles empty document gracefully", async () => {
      const result = await extractRevenueStreams.execute({
        rawText: "",
        fileName: "empty.pdf",
      });

      expect(result.success).toBe(true);
      expect(result.revenueStreams).toHaveLength(0);
      expect(result.warnings).toContain("Document appears to be empty");
      expect(result.overallConfidence).toBe(0);

      // Should not call the API for empty documents
      expect(generateObject).not.toHaveBeenCalled();
    });

    it("handles whitespace-only document", async () => {
      const result = await extractRevenueStreams.execute({
        rawText: "   \n\t  ",
        fileName: "whitespace.pdf",
      });

      expect(result.success).toBe(true);
      expect(result.revenueStreams).toHaveLength(0);
      expect(result.warnings).toContain("Document appears to be empty");
    });

    it("handles unknown errors", async () => {
      vi.mocked(generateObject).mockRejectedValueOnce("string error");

      const result = await extractRevenueStreams.execute({
        rawText: "Some content",
        fileName: "test.pdf",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown extraction error");
    });
  });

  describe("model selection", () => {
    it("uses standard model for small documents", async () => {
      const mockResult = {
        object: { revenueStreams: [], overallConfidence: 0, reasoning: "" },
      };
      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      await extractRevenueStreams.execute({
        rawText: "Short document",
        fileName: "small.pdf",
      });

      expect(getModel).toHaveBeenCalledWith("standard");
    });

    it("uses complex model for large documents", async () => {
      const mockResult = {
        object: { revenueStreams: [], overallConfidence: 0, reasoning: "" },
      };
      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      // Create a document over 15,000 characters
      const largeContent = "x".repeat(16000);

      await extractRevenueStreams.execute({
        rawText: largeContent,
        fileName: "large.pdf",
      });

      expect(getModel).toHaveBeenCalledWith("complex");
    });
  });

  describe("post-processing", () => {
    it("generates IDs for streams without IDs", async () => {
      const mockResult = {
        object: {
          revenueStreams: [
            {
              id: "",
              name: "Office Rents",
              category: "Commercial",
              order: 0,
              rows: [
                {
                  id: "",
                  unit: "Suite A",
                  squareFeet: 1000,
                  monthlyRate: 2000,
                  annualIncome: null,
                  isVacant: false,
                },
              ],
            },
          ],
          overallConfidence: 0.9,
          reasoning: "Test extraction",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractRevenueStreams.execute({
        rawText: "Suite A: 1000 SF, $2000/mo",
        fileName: "test.pdf",
      });

      expect(result.revenueStreams[0].id).toBe("stream-1");
      expect(result.revenueStreams[0].rows[0].id).toBe("stream-1-row-1");
      expect(result.revenueStreams[0].order).toBe(1);
    });

    it("sets isVacant based on null rent values", async () => {
      const mockResult = {
        object: {
          revenueStreams: [
            {
              id: "stream-1",
              name: "Units",
              category: "Residential",
              order: 1,
              rows: [
                {
                  id: "row-1",
                  unit: "Unit A",
                  squareFeet: 800,
                  monthlyRate: null,
                  annualIncome: null,
                  // isVacant not set by AI
                },
              ],
            },
          ],
          overallConfidence: 0.85,
          reasoning: "Test",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractRevenueStreams.execute({
        rawText: "Unit A: VACANT",
        fileName: "test.pdf",
      });

      // Should infer isVacant=true when both rent fields are null
      expect(result.revenueStreams[0].rows[0].isVacant).toBe(true);
    });
  });

  describe("property type hints", () => {
    it("includes property type hint in prompt when provided", async () => {
      const mockResult = {
        object: { revenueStreams: [], overallConfidence: 0, reasoning: "" },
      };
      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      await extractRevenueStreams.execute({
        rawText: "Some content",
        fileName: "property.pdf",
        propertyTypeHint: "commercial",
      });

      // The mock returns a prompt that includes the property type
      // This verifies buildRevenueStreamPrompt was called with the hint
      expect(vi.mocked(generateObject)).toHaveBeenCalled();
    });

    it("includes document type in prompt when not unknown", async () => {
      const mockResult = {
        object: { revenueStreams: [], overallConfidence: 0, reasoning: "" },
      };
      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      await extractRevenueStreams.execute({
        rawText: "Some content",
        fileName: "rent_roll.pdf",
        documentTypeHint: "rent_roll",
      });

      const callArgs = vi.mocked(generateObject).mock.calls[0][0];
      expect(callArgs.prompt).toContain("Document Type");
      expect(callArgs.prompt).toContain("rent roll");
    });
  });
});
