/**
 * Revenue Extraction Agent Tests
 *
 * Tests for the full extraction pipeline:
 * Document → Parser → AI Extraction → RevenueStream[]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractRevenueFromDocument,
  type PropertyTypeHint,
  type ExtractionResult,
} from "./revenue-extraction-agent";
import type { ParsedContent } from "../parsers/types";
import type { RevenueStreamExtractionResult } from "../types/revenue-stream";

// Mock parseFile from parsers
vi.mock("../parsers", () => ({
  parseFile: vi.fn(),
}));

// Mock executeRevenueStreamExtraction from ai/tools
vi.mock("../ai/tools", () => ({
  executeRevenueStreamExtraction: vi.fn(),
}));

import { parseFile } from "../parsers";
import { executeRevenueStreamExtraction } from "../ai/tools";

describe("Revenue Extraction Agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful extraction", () => {
    it("should extract revenue streams from a rent roll document", async () => {
      // Mock parsed content from parser
      const mockParsedContent: ParsedContent = {
        rawText: "Apartment Rent Roll\nUnit 101: 850 SF, $1,500/mo\nUnit 102: 900 SF, $1,600/mo",
        structuredData: undefined,
        metadata: {
          pageCount: 1,
          parsingDurationMs: 250,
        },
      };

      // Mock extraction result from AI
      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [
          {
            id: "stream-1",
            name: "Apartment Rents",
            category: "Residential",
            order: 1,
            rows: [
              {
                id: "row-1",
                unit: "Unit 101",
                squareFeet: 850,
                monthlyRate: 1500,
                annualIncome: null,
                isVacant: false,
              },
              {
                id: "row-2",
                unit: "Unit 102",
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
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("mock PDF content");
      const result = await extractRevenueFromDocument(
        buffer,
        "rent_roll.pdf",
        "application/pdf",
        "residential"
      );

      // Verify parser was called correctly
      expect(parseFile).toHaveBeenCalledWith(buffer, "application/pdf", "rent_roll.pdf");

      // Verify extraction was called with parsed content
      expect(executeRevenueStreamExtraction).toHaveBeenCalledWith({
        rawText: mockParsedContent.rawText,
        structuredData: mockParsedContent.structuredData,
        fileName: "rent_roll.pdf",
        documentTypeHint: "rent_roll",
        propertyTypeHint: "residential",
      });

      // Verify result structure
      expect(result.success).toBe(true);
      expect(result.revenueStreams).toHaveLength(1);
      expect(result.revenueStreams[0].name).toBe("Apartment Rents");
      expect(result.revenueStreams[0].rows).toHaveLength(2);
      expect(result.confidence).toBe(0.95);
      expect(result.reasoning).toBe("Extracted 2 residential units from rent roll");
      expect(result.warnings).toEqual([]);
      expect(result.error).toBeUndefined();

      // Verify metadata
      expect(result.metadata).toEqual({
        fileName: "rent_roll.pdf",
        mimeType: "application/pdf",
        parsingDurationMs: 250,
        extractionDurationMs: expect.any(Number),
      });
      expect(result.metadata.extractionDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle commercial property extraction", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Office Building Rent Roll\nSuite 200: 2,000 SF, $48,000/year",
        structuredData: undefined,
        metadata: {
          pageCount: 1,
          parsingDurationMs: 300,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
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
        warnings: [],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("mock Excel content");
      const result = await extractRevenueFromDocument(
        buffer,
        "office_rent_roll.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "commercial"
      );

      expect(result.success).toBe(true);
      expect(result.revenueStreams[0].category).toBe("Commercial");
      expect(result.revenueStreams[0].rows[0].annualIncome).toBe(48000);
      expect(result.revenueStreams[0].rows[0].monthlyRate).toBeNull();
    });

    it("should handle mixed-use property with multiple streams", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Mixed-use property with retail and residential",
        structuredData: [
          { Unit: "Store 1", "Sq Ft": 1500, Monthly: 3000 },
          { Unit: "Apt 2A", "Sq Ft": 800, Monthly: 1200 },
        ],
        metadata: {
          rowCount: 2,
          columnCount: 3,
          parsingDurationMs: 150,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
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
                annualIncome: null,
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
                unit: "Apt 2A",
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
        warnings: [],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("mock CSV content");
      const result = await extractRevenueFromDocument(
        buffer,
        "mixed_use.csv",
        "text/csv",
        "mixed_use"
      );

      expect(result.success).toBe(true);
      expect(result.revenueStreams).toHaveLength(3);

      const categories = result.revenueStreams.map((s) => s.category);
      expect(categories).toContain("Commercial");
      expect(categories).toContain("Residential");
      expect(categories).toContain("Miscellaneous");
    });

    it("should handle structured data from Excel parser", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Excel rent roll with tabular data",
        structuredData: [
          { Unit: "Suite A", "Sq Ft": 1000, Monthly: 2000, Annual: 24000 },
          { Unit: "Suite B", "Sq Ft": 1200, Monthly: 2400, Annual: 28800 },
        ],
        metadata: {
          rowCount: 2,
          columnCount: 4,
          columnHeaders: ["Unit", "Sq Ft", "Monthly", "Annual"],
          parsingDurationMs: 200,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
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
              {
                id: "row-2",
                unit: "Suite B",
                squareFeet: 1200,
                monthlyRate: 2400,
                annualIncome: 28800,
                isVacant: false,
              },
            ],
          },
        ],
        overallConfidence: 0.98,
        reasoning: "High confidence extraction from structured Excel data",
        warnings: [],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("mock Excel content");
      const result = await extractRevenueFromDocument(
        buffer,
        "rent_roll.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // Verify structured data was passed to extraction
      expect(executeRevenueStreamExtraction).toHaveBeenCalledWith(
        expect.objectContaining({
          structuredData: mockParsedContent.structuredData,
        })
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.98);
    });

    it("should include warnings from extraction", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Partial rent roll with missing data",
        metadata: {
          parsingDurationMs: 180,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [
          {
            id: "stream-1",
            name: "Apartment Rents",
            category: "Residential",
            order: 1,
            rows: [
              {
                id: "row-1",
                unit: "Unit 101",
                squareFeet: null,
                monthlyRate: 1500,
                annualIncome: null,
                isVacant: false,
              },
            ],
          },
        ],
        overallConfidence: 0.65,
        reasoning: "Extracted with partial data",
        warnings: ["Missing square footage for Unit 101", "Document appears to be incomplete"],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("mock content");
      const result = await extractRevenueFromDocument(buffer, "partial.pdf", "application/pdf");

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings).toContain("Missing square footage for Unit 101");
      expect(result.warnings).toContain("Document appears to be incomplete");
      expect(result.confidence).toBe(0.65);
    });
  });

  describe("parser error handling", () => {
    it("should handle parser errors gracefully", async () => {
      vi.mocked(parseFile).mockRejectedValueOnce(new Error("PDF parsing failed: Corrupted file"));

      const buffer = Buffer.from("corrupted PDF");
      const result = await extractRevenueFromDocument(buffer, "corrupted.pdf", "application/pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Revenue extraction failed");
      expect(result.error).toContain("PDF parsing failed: Corrupted file");
      expect(result.revenueStreams).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toBe("");
      expect(result.warnings).toEqual([]);

      // Verify metadata is still populated
      expect(result.metadata.fileName).toBe("corrupted.pdf");
      expect(result.metadata.mimeType).toBe("application/pdf");
      expect(result.metadata.extractionDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.parsingDurationMs).toBeUndefined();

      // Verify extraction was never called
      expect(executeRevenueStreamExtraction).not.toHaveBeenCalled();
    });

    it("should handle unsupported file type errors", async () => {
      vi.mocked(parseFile).mockRejectedValueOnce(
        new Error("Unsupported file type: application/msword")
      );

      const buffer = Buffer.from("word document");
      const result = await extractRevenueFromDocument(buffer, "document.doc", "application/msword");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported file type");
      expect(result.revenueStreams).toEqual([]);
    });

    it("should handle parser timeout errors", async () => {
      vi.mocked(parseFile).mockRejectedValueOnce(new Error("Parser timeout: Document too large"));

      const buffer = Buffer.from("very large document");
      const result = await extractRevenueFromDocument(
        buffer,
        "large_document.pdf",
        "application/pdf"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Parser timeout");
    });
  });

  describe("extraction error handling", () => {
    it("should handle extraction errors gracefully", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Some content",
        metadata: {
          parsingDurationMs: 100,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: false,
        revenueStreams: [],
        overallConfidence: 0,
        reasoning: "",
        error: "Revenue stream extraction failed: API rate limit exceeded",
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("mock content");
      const result = await extractRevenueFromDocument(buffer, "test.pdf", "application/pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("API rate limit exceeded");
      expect(result.revenueStreams).toEqual([]);
      expect(result.confidence).toBe(0);

      // Verify metadata includes parsing duration
      expect(result.metadata.parsingDurationMs).toBe(100);
      expect(result.metadata.extractionDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle AI model errors", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Content for AI extraction",
        metadata: {
          parsingDurationMs: 150,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: false,
        revenueStreams: [],
        overallConfidence: 0,
        reasoning: "",
        error: "Revenue stream extraction failed: Claude API returned 503 Service Unavailable",
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("mock content");
      const result = await extractRevenueFromDocument(buffer, "test.pdf", "application/pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Claude API returned 503");
    });

    it("should handle validation errors from AI", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Malformed content",
        metadata: {
          parsingDurationMs: 120,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: false,
        revenueStreams: [],
        overallConfidence: 0,
        reasoning: "",
        error: "Revenue stream extraction failed: Zod validation error",
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("mock content");
      const result = await extractRevenueFromDocument(buffer, "test.pdf", "application/pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Zod validation error");
    });
  });

  describe("empty document handling", () => {
    it("should handle empty document from parser", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "",
        metadata: {
          parsingDurationMs: 50,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [],
        overallConfidence: 0,
        reasoning: "No content to extract from document",
        warnings: ["Document appears to be empty"],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("");
      const result = await extractRevenueFromDocument(buffer, "empty.pdf", "application/pdf");

      expect(result.success).toBe(true);
      expect(result.revenueStreams).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain("Document appears to be empty");
    });

    it("should handle whitespace-only document", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "   \n\t  ",
        metadata: {
          parsingDurationMs: 60,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [],
        overallConfidence: 0,
        reasoning: "No content to extract from document",
        warnings: ["Document appears to be empty"],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("   \n\t  ");
      const result = await extractRevenueFromDocument(buffer, "whitespace.pdf", "application/pdf");

      expect(result.success).toBe(true);
      expect(result.revenueStreams).toEqual([]);
      expect(result.warnings).toContain("Document appears to be empty");
    });

    it("should handle document with no extractable revenue data", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "This is a contract document with no rent roll data",
        metadata: {
          parsingDurationMs: 200,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [],
        overallConfidence: 0.3,
        reasoning: "No revenue stream data found in document",
        warnings: ["Document does not appear to contain a rent roll"],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("contract content");
      const result = await extractRevenueFromDocument(buffer, "contract.pdf", "application/pdf");

      expect(result.success).toBe(true);
      expect(result.revenueStreams).toEqual([]);
      expect(result.confidence).toBe(0.3);
      expect(result.warnings).toContain("Document does not appear to contain a rent roll");
    });
  });

  describe("metadata tracking", () => {
    it("should track parsing and extraction timing metadata", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Unit data",
        metadata: {
          parsingDurationMs: 175,
          pageCount: 2,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [
          {
            id: "stream-1",
            name: "Rents",
            category: "Residential",
            order: 1,
            rows: [],
          },
        ],
        overallConfidence: 0.9,
        reasoning: "Extracted successfully",
        warnings: [],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const startTime = Date.now();
      const buffer = Buffer.from("mock content");
      const result = await extractRevenueFromDocument(buffer, "test.pdf", "application/pdf");
      const endTime = Date.now();

      // Verify metadata structure
      expect(result.metadata).toEqual({
        fileName: "test.pdf",
        mimeType: "application/pdf",
        parsingDurationMs: 175,
        extractionDurationMs: expect.any(Number),
      });

      // Verify timing is reasonable
      expect(result.metadata.extractionDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.extractionDurationMs).toBeLessThanOrEqual(
        endTime - startTime + 10 // Allow 10ms tolerance
      );
    });

    it("should include all metadata fields correctly", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Excel data",
        structuredData: [{ Unit: "A", Rent: 1000 }],
        metadata: {
          parsingDurationMs: 95,
          rowCount: 10,
          columnCount: 5,
          columnHeaders: ["Unit", "Sq Ft", "Rent", "Status", "Notes"],
          fileSizeBytes: 51200,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [],
        overallConfidence: 0.85,
        reasoning: "Processed Excel file",
        warnings: [],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("excel content");
      const result = await extractRevenueFromDocument(
        buffer,
        "rent_roll.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "commercial"
      );

      expect(result.metadata.fileName).toBe("rent_roll.xlsx");
      expect(result.metadata.mimeType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(result.metadata.parsingDurationMs).toBe(95);
      expect(result.metadata.extractionDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should track timing even when extraction fails", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Content",
        metadata: {
          parsingDurationMs: 120,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: false,
        revenueStreams: [],
        overallConfidence: 0,
        reasoning: "",
        error: "Extraction failed",
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("content");
      const result = await extractRevenueFromDocument(buffer, "test.pdf", "application/pdf");

      expect(result.success).toBe(false);
      expect(result.metadata.parsingDurationMs).toBe(120);
      expect(result.metadata.extractionDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should track timing even when parser fails", async () => {
      vi.mocked(parseFile).mockRejectedValueOnce(new Error("Parser failed"));

      const startTime = Date.now();
      const buffer = Buffer.from("content");
      const result = await extractRevenueFromDocument(buffer, "test.pdf", "application/pdf");
      const endTime = Date.now();

      expect(result.success).toBe(false);
      expect(result.metadata.parsingDurationMs).toBeUndefined();
      expect(result.metadata.extractionDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.extractionDurationMs).toBeLessThanOrEqual(endTime - startTime + 10);
    });
  });

  describe("property type hints", () => {
    it("should pass property type hint to extraction", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Property data",
        metadata: {
          parsingDurationMs: 100,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [],
        overallConfidence: 0.9,
        reasoning: "Processed with property type hint",
        warnings: [],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const propertyTypes: PropertyTypeHint[] = [
        "residential",
        "commercial",
        "mixed_use",
        "unknown",
      ];

      for (const propertyType of propertyTypes) {
        vi.clearAllMocks();
        vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
        vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

        const buffer = Buffer.from("content");
        await extractRevenueFromDocument(buffer, "test.pdf", "application/pdf", propertyType);

        expect(executeRevenueStreamExtraction).toHaveBeenCalledWith(
          expect.objectContaining({
            propertyTypeHint: propertyType,
          })
        );
      }
    });

    it("should work without property type hint (optional)", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Property data",
        metadata: {
          parsingDurationMs: 100,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [],
        overallConfidence: 0.85,
        reasoning: "Processed without property type hint",
        warnings: [],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("content");
      const result = await extractRevenueFromDocument(
        buffer,
        "test.pdf",
        "application/pdf"
        // No propertyTypeHint provided
      );

      expect(result.success).toBe(true);
      expect(executeRevenueStreamExtraction).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyTypeHint: undefined,
        })
      );
    });
  });

  describe("document type hint", () => {
    it("should always pass rent_roll as document type hint", async () => {
      const mockParsedContent: ParsedContent = {
        rawText: "Content",
        metadata: {
          parsingDurationMs: 100,
        },
      };

      const mockExtractionResult: RevenueStreamExtractionResult = {
        success: true,
        revenueStreams: [],
        overallConfidence: 0.9,
        reasoning: "Processed",
        warnings: [],
      };

      vi.mocked(parseFile).mockResolvedValueOnce(mockParsedContent);
      vi.mocked(executeRevenueStreamExtraction).mockResolvedValueOnce(mockExtractionResult);

      const buffer = Buffer.from("content");
      await extractRevenueFromDocument(buffer, "test.pdf", "application/pdf");

      expect(executeRevenueStreamExtraction).toHaveBeenCalledWith(
        expect.objectContaining({
          documentTypeHint: "rent_roll",
        })
      );
    });
  });
});
