/**
 * Categorization Tool Tests
 *
 * Tests for line item categorization using mocked Claude API.
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
vi.mock("../prompts/categorization-prompt", () => ({
  getCategorizationSystemPrompt: vi.fn(
    () => "You are a financial categorization specialist..."
  ),
  buildCategorizationPrompt: vi.fn(
    (items) => `Categorize: ${items.map((i: { label: string }) => i.label).join(", ")}`
  ),
}));

import { generateObject } from "ai";
import { categorizeLineItems } from "./categorize-line-items";

// Helper type for test input
type TestLineItem = {
  label: string;
  value: number;
  confidence: number;
  originalPeriod: "monthly" | "quarterly" | "annual" | "unknown";
  annualizedValue: number;
  context?: string;
  reasoning: string;
};

describe("categorizeLineItems Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool configuration", () => {
    it("has correct description", () => {
      expect(categorizeLineItems.description).toContain(
        "Categorize extracted financial line items"
      );
    });

    it("has required inputSchema defined", () => {
      expect(categorizeLineItems.inputSchema).toBeDefined();
    });
  });

  describe("successful categorization", () => {
    it("categorizes revenue items correctly", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Base Rent",
              value: 30000,
              annualizedValue: 30000,
              category: "revenue",
              subcategory: "baseRent",
              normalizedKey: "baseRent",
              categorizationReasoning: "Primary rental income from tenants",
            },
            {
              label: "Parking Income",
              value: 5000,
              annualizedValue: 5000,
              category: "revenue",
              subcategory: "parkingIncome",
              normalizedKey: "parkingIncome",
              categorizationReasoning: "Ancillary income from parking fees",
            },
          ],
          reasoning: "Categorized 2 items as recurring revenue",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const lineItems: TestLineItem[] = [
        {
          label: "Base Rent",
          value: 2500,
          confidence: 0.95,
          originalPeriod: "monthly",
          annualizedValue: 30000,
          reasoning: "Monthly rent",
        },
        {
          label: "Parking Income",
          value: 5000,
          confidence: 0.9,
          originalPeriod: "annual",
          annualizedValue: 5000,
          reasoning: "Annual parking revenue",
        },
      ];

      const result = await categorizeLineItems.execute({ lineItems });

      expect(result.success).toBe(true);
      expect(result.summary.revenueCount).toBe(2);
      expect(result.categorizedItems[0].category).toBe("revenue");
      expect(result.categorizedItems[0].normalizedKey).toBe("baseRent");
    });

    it("categorizes expense items correctly", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Property Tax",
              value: 15000,
              annualizedValue: 15000,
              category: "expense",
              subcategory: "propertyTax",
              normalizedKey: "propertyTax",
              categorizationReasoning: "Recurring real estate tax obligation",
            },
            {
              label: "Insurance",
              value: 8000,
              annualizedValue: 8000,
              category: "expense",
              subcategory: "insurance",
              normalizedKey: "insurance",
              categorizationReasoning: "Annual property insurance premium",
            },
          ],
          reasoning: "Categorized 2 items as operating expenses",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const lineItems: TestLineItem[] = [
        {
          label: "Property Tax",
          value: 15000,
          confidence: 0.98,
          originalPeriod: "annual",
          annualizedValue: 15000,
          reasoning: "Annual tax",
        },
        {
          label: "Insurance",
          value: 8000,
          confidence: 0.95,
          originalPeriod: "annual",
          annualizedValue: 8000,
          reasoning: "Insurance premium",
        },
      ];

      const result = await categorizeLineItems.execute({ lineItems });

      expect(result.success).toBe(true);
      expect(result.summary.expenseCount).toBe(2);
      expect(result.categorizedItems[0].category).toBe("expense");
    });

    it("categorizes adjustment items correctly", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Replacement Reserves",
              value: 5000,
              annualizedValue: 5000,
              category: "adjustment",
              subcategory: "replacementReserves",
              normalizedKey: "replacementReserves",
              categorizationReasoning: "Capital reserve for future replacements",
            },
            {
              label: "Vacancy Allowance",
              value: 3000,
              annualizedValue: 3000,
              category: "adjustment",
              subcategory: "vacancyAllowance",
              normalizedKey: "vacancyAllowance",
              categorizationReasoning: "Market vacancy adjustment",
            },
          ],
          reasoning: "Categorized 2 items as one-time adjustments",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const lineItems: TestLineItem[] = [
        {
          label: "Replacement Reserves",
          value: 5000,
          confidence: 0.85,
          originalPeriod: "annual",
          annualizedValue: 5000,
          reasoning: "Reserve fund",
        },
        {
          label: "Vacancy Allowance",
          value: 3000,
          confidence: 0.8,
          originalPeriod: "annual",
          annualizedValue: 3000,
          reasoning: "Vacancy deduction",
        },
      ];

      const result = await categorizeLineItems.execute({ lineItems });

      expect(result.success).toBe(true);
      expect(result.summary.adjustmentCount).toBe(2);
      expect(result.categorizedItems[0].category).toBe("adjustment");
    });
  });

  describe("custom mappings", () => {
    it("applies custom category mappings", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Miscellaneous Fee",
              value: 1000,
              annualizedValue: 1000,
              category: "expense", // AI says expense
              subcategory: "miscellaneous",
              normalizedKey: "miscellaneousFee",
              categorizationReasoning: "Unclear categorization",
              flags: ["ambiguous"],
            },
          ],
          reasoning: "AI categorized as expense but custom mapping may override",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const lineItems: TestLineItem[] = [
        {
          label: "Miscellaneous Fee",
          value: 1000,
          confidence: 0.6,
          originalPeriod: "annual",
          annualizedValue: 1000,
          reasoning: "Unclear fee",
        },
      ];

      const result = await categorizeLineItems.execute({
        lineItems,
        customMappings: {
          "Miscellaneous Fee": "revenue", // Override to revenue
        },
      });

      expect(result.success).toBe(true);
      // Custom mapping should override AI decision
      expect(result.categorizedItems[0].category).toBe("revenue");
    });

    it("includes custom mappings in prompt", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Test Item",
              value: 1000,
              annualizedValue: 1000,
              category: "revenue",
              subcategory: "other",
              normalizedKey: "testItem",
              categorizationReasoning: "Custom mapping applied",
            },
          ],
          reasoning: "Custom mappings provided",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      await categorizeLineItems.execute({
        lineItems: [
          {
            label: "Test Item",
            value: 1000,
            confidence: 0.9,
            originalPeriod: "annual",
            annualizedValue: 1000,
            reasoning: "Test",
          },
        ],
        customMappings: {
          "Test Item": "revenue",
        },
      });

      const callArgs = vi.mocked(generateObject).mock.calls[0][0];
      expect(callArgs.prompt).toContain("Custom Category Mappings");
      expect(callArgs.prompt).toContain("Test Item");
    });
  });

  describe("flagged items", () => {
    it("identifies items needing review", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Other Income",
              value: 2000,
              annualizedValue: 2000,
              category: "revenue",
              subcategory: "otherIncome",
              normalizedKey: "otherIncome",
              categorizationReasoning: "Unclear source of income",
              flags: ["ambiguous", "needsVerification"],
            },
          ],
          reasoning: "Item flagged for manual review",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const lineItems: TestLineItem[] = [
        {
          label: "Other Income",
          value: 2000,
          confidence: 0.5,
          originalPeriod: "annual",
          annualizedValue: 2000,
          reasoning: "Unspecified income",
        },
      ];

      const result = await categorizeLineItems.execute({ lineItems });

      expect(result.success).toBe(true);
      expect(result.flaggedForReview).toHaveLength(1);
      expect(result.flaggedForReview[0].flags).toContain("ambiguous");
    });
  });

  describe("error handling", () => {
    it("returns structured error on API failure", async () => {
      vi.mocked(generateObject).mockRejectedValueOnce(new Error("Model timeout"));

      const lineItems: TestLineItem[] = [
        {
          label: "Test Item",
          value: 1000,
          confidence: 0.9,
          originalPeriod: "annual",
          annualizedValue: 1000,
          reasoning: "Test",
        },
      ];

      const result = await categorizeLineItems.execute({ lineItems });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Categorization failed");
      expect(result.error).toContain("Model timeout");
      expect(result.categorizedItems).toEqual([]);
    });

    it("handles empty input gracefully", async () => {
      const result = await categorizeLineItems.execute({
        lineItems: [],
      });

      expect(result.success).toBe(true);
      expect(result.categorizedItems).toHaveLength(0);
      expect(result.summary).toEqual({
        revenueCount: 0,
        expenseCount: 0,
        adjustmentCount: 0,
      });
      expect(result.reasoning).toBe("No items to categorize");

      // generateObject should not be called for empty input
      expect(generateObject).not.toHaveBeenCalled();
    });

    it("handles unknown errors", async () => {
      vi.mocked(generateObject).mockRejectedValueOnce("string error");

      const result = await categorizeLineItems.execute({
        lineItems: [
          {
            label: "Test",
            value: 100,
            confidence: 0.9,
            originalPeriod: "annual",
            annualizedValue: 100,
            reasoning: "Test",
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown categorization error");
    });
  });

  describe("mixed categories", () => {
    it("correctly summarizes mixed category results", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Rent",
              value: 50000,
              annualizedValue: 50000,
              category: "revenue",
              subcategory: "baseRent",
              normalizedKey: "rent",
              categorizationReasoning: "Primary income",
            },
            {
              label: "Utilities",
              value: 5000,
              annualizedValue: 5000,
              category: "expense",
              subcategory: "utilities",
              normalizedKey: "utilities",
              categorizationReasoning: "Operating expense",
            },
            {
              label: "Repairs",
              value: 3000,
              annualizedValue: 3000,
              category: "expense",
              subcategory: "repairs",
              normalizedKey: "repairs",
              categorizationReasoning: "Maintenance expense",
            },
            {
              label: "Capital Reserve",
              value: 2000,
              annualizedValue: 2000,
              category: "adjustment",
              subcategory: "capitalReserve",
              normalizedKey: "capitalReserve",
              categorizationReasoning: "Non-recurring reserve",
            },
          ],
          reasoning: "Categorized 4 items: 1 revenue, 2 expenses, 1 adjustment",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const lineItems: TestLineItem[] = [
        {
          label: "Rent",
          value: 50000,
          confidence: 0.99,
          originalPeriod: "annual",
          annualizedValue: 50000,
          reasoning: "Rent",
        },
        {
          label: "Utilities",
          value: 5000,
          confidence: 0.95,
          originalPeriod: "annual",
          annualizedValue: 5000,
          reasoning: "Utilities",
        },
        {
          label: "Repairs",
          value: 3000,
          confidence: 0.9,
          originalPeriod: "annual",
          annualizedValue: 3000,
          reasoning: "Repairs",
        },
        {
          label: "Capital Reserve",
          value: 2000,
          confidence: 0.85,
          originalPeriod: "annual",
          annualizedValue: 2000,
          reasoning: "Reserve",
        },
      ];

      const result = await categorizeLineItems.execute({ lineItems });

      expect(result.success).toBe(true);
      expect(result.summary).toEqual({
        revenueCount: 1,
        expenseCount: 2,
        adjustmentCount: 1,
      });
    });
  });

  describe("metadata preservation", () => {
    it("preserves original extraction metadata in categorized items", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Base Rent",
              value: 30000,
              annualizedValue: 30000,
              category: "revenue",
              subcategory: "baseRent",
              normalizedKey: "baseRent",
              categorizationReasoning: "Primary rental income",
            },
          ],
          reasoning: "Categorized 1 item",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const lineItems: TestLineItem[] = [
        {
          label: "Base Rent",
          value: 2500,
          confidence: 0.95,
          originalPeriod: "monthly",
          annualizedValue: 30000,
          context: "From rent roll table",
          reasoning: "Monthly rent extracted from table row",
        },
      ];

      const result = await categorizeLineItems.execute({ lineItems });

      expect(result.success).toBe(true);
      // Should preserve original extraction metadata
      expect(result.categorizedItems[0].confidence).toBe(0.95);
      expect(result.categorizedItems[0].originalPeriod).toBe("monthly");
      expect(result.categorizedItems[0].context).toBe("From rent roll table");
      expect(result.categorizedItems[0].reasoning).toBe(
        "Monthly rent extracted from table row"
      );
    });

    it("uses default values when original item not found", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Unknown Item", // Different label than input
              value: 1000,
              annualizedValue: 1000,
              category: "expense",
              subcategory: "other",
              normalizedKey: "unknownItem",
              categorizationReasoning: "Categorized as expense",
            },
          ],
          reasoning: "Categorized 1 item",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const lineItems: TestLineItem[] = [
        {
          label: "Test Item",
          value: 1000,
          confidence: 0.9,
          originalPeriod: "annual",
          annualizedValue: 1000,
          reasoning: "Test",
        },
      ];

      const result = await categorizeLineItems.execute({ lineItems });

      expect(result.success).toBe(true);
      // Should use default values when original not found
      expect(result.categorizedItems[0].confidence).toBe(0.5);
      expect(result.categorizedItems[0].originalPeriod).toBe("unknown");
    });
  });

  describe("normalizedKey generation", () => {
    it("generates normalizedKey from label when not provided", async () => {
      const mockResult = {
        object: {
          categorizedItems: [
            {
              label: "Property Tax Expense",
              value: 15000,
              annualizedValue: 15000,
              category: "expense",
              subcategory: "propertyTax",
              normalizedKey: "", // Empty normalizedKey
              categorizationReasoning: "Tax expense",
            },
          ],
          reasoning: "Categorized 1 item",
        },
      };

      vi.mocked(generateObject).mockResolvedValueOnce(mockResult);

      const result = await categorizeLineItems.execute({
        lineItems: [
          {
            label: "Property Tax Expense",
            value: 15000,
            confidence: 0.95,
            originalPeriod: "annual",
            annualizedValue: 15000,
            reasoning: "Tax",
          },
        ],
      });

      expect(result.success).toBe(true);
      // Should generate camelCase key from label
      expect(result.categorizedItems[0].normalizedKey).toBe("propertyTaxExpense");
    });
  });
});
