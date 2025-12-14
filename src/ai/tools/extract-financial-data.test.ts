/**
 * Extraction Tool Tests
 *
 * Tests for financial data extraction using mocked Claude API.
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
vi.mock("../prompts/extraction-prompt", () => ({
  getExtractionSystemPrompt: vi.fn(() => "You are a financial extraction specialist..."),
  buildExtractionPrompt: vi.fn((content, fileName) => `Extract from ${fileName}: ${content}`),
}));

import { generateObject } from "ai";
import { extractFinancialData } from "./extract-financial-data";
import { getModel } from "../config";

describe("extractFinancialData Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool configuration", () => {
    it("has correct description", () => {
      expect(extractFinancialData.description).toContain("Extract financial line items");
    });

    it("has required inputSchema defined", () => {
      expect(extractFinancialData.inputSchema).toBeDefined();
    });
  });

  describe("successful extraction", () => {
    it("extracts line items from rent roll text", async () => {
      const mockResult = {
        object: {
          lineItems: [
            {
              label: "Base Rent - Unit 101",
              value: 2500,
              confidence: 0.95,
              originalPeriod: "monthly",
              annualizedValue: 30000,
              context: "Tenant: ABC Corp",
              reasoning: "Monthly rent payment for commercial unit",
            },
            {
              label: "CAM Recovery",
              value: 500,
              confidence: 0.88,
              originalPeriod: "monthly",
              annualizedValue: 6000,
              reasoning: "Common area maintenance reimbursement",
            },
          ],
          overallConfidence: 0.92,
          reasoning: "Extracted 2 revenue items from rent roll document",
          warnings: [],
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractFinancialData.execute({
        rawText: "Unit 101: Base Rent $2,500/month, CAM $500/month",
        fileName: "rent_roll.pdf",
        documentTypeHint: "rent_roll",
      });

      expect(result.success).toBe(true);
      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[0].label).toBe("Base Rent - Unit 101");
      expect(result.lineItems[0].annualizedValue).toBe(30000);
      expect(result.overallConfidence).toBe(0.92);
    });

    it("extracts from operating statement with expenses", async () => {
      const mockResult = {
        object: {
          lineItems: [
            {
              label: "Property Tax",
              value: 15000,
              confidence: 0.98,
              originalPeriod: "annual",
              annualizedValue: 15000,
              reasoning: "Annual real estate tax expense",
            },
            {
              label: "Insurance",
              value: 8000,
              confidence: 0.95,
              originalPeriod: "annual",
              annualizedValue: 8000,
              reasoning: "Annual property insurance premium",
            },
          ],
          overallConfidence: 0.96,
          reasoning: "Extracted expense items from operating statement",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractFinancialData.execute({
        rawText: "Operating Expenses:\nProperty Tax: $15,000\nInsurance: $8,000",
        fileName: "operating_statement.xlsx",
        documentTypeHint: "operating_statement",
      });

      expect(result.success).toBe(true);
      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[0].originalPeriod).toBe("annual");
    });

    it("handles structured data from Excel/CSV", async () => {
      const mockResult = {
        object: {
          lineItems: [
            {
              label: "Rental Income",
              value: 100000,
              confidence: 0.99,
              originalPeriod: "annual",
              annualizedValue: 100000,
              reasoning: "Total rental income from structured data",
            },
          ],
          overallConfidence: 0.99,
          reasoning: "High confidence due to structured tabular data",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractFinancialData.execute({
        rawText: "CSV Data Summary:\nRow 1: Rental Income: 100000",
        structuredData: [{ "Line Item": "Rental Income", Amount: 100000 }],
        fileName: "income.csv",
      });

      expect(result.success).toBe(true);
      expect(result.lineItems[0].confidence).toBe(0.99);

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

      const result = await extractFinancialData.execute({
        rawText: "Some content",
        fileName: "test.pdf",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Extraction failed");
      expect(result.error).toContain("API rate limit exceeded");
      expect(result.lineItems).toEqual([]);
    });

    it("handles empty document gracefully", async () => {
      const mockResult = {
        object: {
          lineItems: [],
          overallConfidence: 0,
          reasoning: "No financial data found in document",
          warnings: ["Document appears to be empty or non-financial"],
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractFinancialData.execute({
        rawText: "",
        fileName: "empty.pdf",
      });

      expect(result.success).toBe(true);
      expect(result.lineItems).toHaveLength(0);
      expect(result.warnings).toContain(
        "Document appears to be empty or non-financial"
      );
    });

    it("handles unknown errors", async () => {
      vi.mocked(generateObject).mockRejectedValueOnce("string error");

      const result = await extractFinancialData.execute({
        rawText: "Some content",
        fileName: "test.pdf",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown extraction error");
    });
  });

  describe("time period handling", () => {
    it("correctly handles monthly values", async () => {
      const mockResult = {
        object: {
          lineItems: [
            {
              label: "Monthly Rent",
              value: 5000,
              confidence: 0.95,
              originalPeriod: "monthly",
              annualizedValue: 60000,
              reasoning: "Monthly rental income",
            },
          ],
          overallConfidence: 0.95,
          reasoning: "Detected monthly values and annualized",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractFinancialData.execute({
        rawText: "Monthly Rent: $5,000",
        fileName: "lease.pdf",
      });

      expect(result.lineItems[0].annualizedValue).toBe(60000);
      expect(result.lineItems[0].originalPeriod).toBe("monthly");
    });

    it("correctly handles quarterly values", async () => {
      const mockResult = {
        object: {
          lineItems: [
            {
              label: "Quarterly Insurance",
              value: 2000,
              confidence: 0.9,
              originalPeriod: "quarterly",
              annualizedValue: 8000,
              reasoning: "Quarterly insurance payment",
            },
          ],
          overallConfidence: 0.9,
          reasoning: "Detected quarterly values and annualized",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await extractFinancialData.execute({
        rawText: "Q1 Insurance: $2,000",
        fileName: "insurance.pdf",
      });

      expect(result.lineItems[0].annualizedValue).toBe(8000);
      expect(result.lineItems[0].originalPeriod).toBe("quarterly");
    });
  });

  describe("model selection", () => {
    it("uses standard model for small documents", async () => {
      const mockResult = {
        object: { lineItems: [], overallConfidence: 0, reasoning: "" },
      };
      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      await extractFinancialData.execute({
        rawText: "Short document",
        fileName: "small.pdf",
      });

      expect(getModel).toHaveBeenCalledWith("standard");
    });

    it("uses complex model for large documents", async () => {
      const mockResult = {
        object: { lineItems: [], overallConfidence: 0, reasoning: "" },
      };
      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      // Create a document over 10,000 characters
      const largeContent = "x".repeat(15000);

      await extractFinancialData.execute({
        rawText: largeContent,
        fileName: "large.pdf",
      });

      expect(getModel).toHaveBeenCalledWith("complex");
    });
  });

  describe("document type hints", () => {
    it("includes document type hint in prompt when provided", async () => {
      const mockResult = {
        object: { lineItems: [], overallConfidence: 0, reasoning: "" },
      };
      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      await extractFinancialData.execute({
        rawText: "Some content",
        fileName: "statement.pdf",
        documentTypeHint: "profit_loss",
      });

      const callArgs = vi.mocked(generateObject).mock.calls[0][0];
      expect(callArgs.prompt).toContain("Document Type Hint");
      expect(callArgs.prompt).toContain("profit_loss");
    });

    it("does not include document type hint when unknown", async () => {
      const mockResult = {
        object: { lineItems: [], overallConfidence: 0, reasoning: "" },
      };
      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      await extractFinancialData.execute({
        rawText: "Some content",
        fileName: "document.pdf",
        documentTypeHint: "unknown",
      });

      const callArgs = vi.mocked(generateObject).mock.calls[0][0];
      expect(callArgs.prompt).not.toContain("Document Type Hint");
    });
  });
});
