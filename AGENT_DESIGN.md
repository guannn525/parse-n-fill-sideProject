# AGENT_DESIGN.md

AI agent design patterns and guidelines for PARSE-N-FILL.

## Core Philosophy

> **"Agents decide, tools execute"**

The AI agent handles reasoning, context understanding, and decision-making. Tools handle deterministic operations like data extraction and validation.

### Anti-Pattern to Avoid

```typescript
// BAD: Tool makes decisions
execute: async ({ content }) => {
  // Don't hard-code heuristics in tools
  if (content.includes("rent")) {
    return { category: "revenue" };
  }
  // This misses edge cases like "rent expense"
}

// GOOD: Tool returns data, agent decides
execute: async ({ content }) => {
  // Return all matches, let agent categorize
  const matches = extractAllLineItems(content);
  return { matches, metadata: { count: matches.length } };
}
```

## Agent Architecture

### Financial Extraction Agent

The main agent orchestrates document parsing through multi-step reasoning.

```typescript
import { generateText } from "ai";
import { aiModel, AI_CONFIG } from "../ai/config";

export async function runFinancialExtractionAgent(
  parsedContent: string,
  fileName: string
): Promise<DirectCapResult> {
  const startTime = Date.now();

  const result = await generateText({
    model: aiModel,
    maxSteps: AI_CONFIG.maxSteps,
    tools: {
      extractFinancialData: extractFinancialDataTool,
      categorizeLineItems: categorizeLineItemsTool,
      validateExtraction: validateExtractionTool,
    },
    system: getExtractionSystemPrompt(),
    prompt: buildExtractionPrompt(parsedContent, fileName),
  });

  return {
    model: extractModelFromResult(result),
    calculations: calculateMetrics(result),
    metadata: {
      sourceFileName: fileName,
      processingTimeMs: Date.now() - startTime,
      confidence: calculateConfidence(result),
    },
  };
}
```

### Orchestration Flow

```
Step 1: extractFinancialData
   ↓
   Agent analyzes extracted items
   ↓
Step 2: categorizeLineItems
   ↓
   Agent reviews categorizations
   ↓
Step 3: validateExtraction
   ↓
   Agent confirms or corrects
   ↓
Final: Structured output
```

## Tool Definitions

### Tool Design Pattern

All tools follow the Vercel AI SDK pattern:

```typescript
import { tool } from "ai";
import { z } from "zod";

export const myTool = tool({
  description: `Clear, detailed description for the agent.

  What this tool does:
  - Point 1
  - Point 2

  When to use:
  - Scenario A
  - Scenario B`,

  inputSchema: z.object({
    param1: z.string().describe("What this parameter is for"),
    param2: z.number().optional().describe("Optional parameter"),
  }),

  execute: async ({ param1, param2 }) => {
    // Always return structured result
    // Never throw - return error in result
    try {
      const result = await doWork(param1, param2);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
});
```

### extractFinancialData Tool

```typescript
export const extractFinancialDataTool = tool({
  description: `Extract financial line items from parsed document content.

  Identifies:
  - Revenue items: rent, fees, parking, laundry, other income
  - Expense items: taxes, insurance, utilities, maintenance, management
  - Adjustment items: capital reserves, deferred maintenance, vacancy

  Returns all identified items with their dollar amounts.
  Does NOT categorize - that's for the categorizeLineItems tool.`,

  inputSchema: z.object({
    content: z.string().describe("Parsed document text content"),
    focusArea: z.enum(["revenue", "expenses", "adjustments", "all"])
      .default("all")
      .describe("Focus extraction on specific category"),
  }),

  execute: async ({ content, focusArea }) => {
    const lineItems = [];

    // Pattern matching for financial data
    const patterns = {
      currency: /\$[\d,]+(?:\.\d{2})?/g,
      percentage: /\d+(?:\.\d+)?%/g,
      labelValue: /([A-Za-z\s]+)[:]\s*\$?([\d,]+(?:\.\d{2})?)/g,
    };

    // Extract matches
    let match;
    while ((match = patterns.labelValue.exec(content)) !== null) {
      lineItems.push({
        label: match[1].trim(),
        value: parseFloat(match[2].replace(/,/g, "")),
        context: getContextAround(content, match.index),
      });
    }

    return {
      success: true,
      lineItems,
      totalFound: lineItems.length,
      focusArea,
    };
  },
});
```

### categorizeLineItems Tool

```typescript
export const categorizeLineItemsTool = tool({
  description: `Categorize financial line items into revenue, expenses, or adjustments.

  Categories:
  - REVENUE: Income-generating items (rent, fees, parking)
  - EXPENSES: Operating costs (taxes, insurance, utilities, repairs)
  - ADJUSTMENTS: One-time or non-operating items (reserves, capital improvements)

  Uses commercial real estate domain knowledge for categorization.`,

  inputSchema: z.object({
    lineItems: z.array(z.object({
      label: z.string(),
      value: z.number(),
      context: z.string().optional(),
    })).describe("Line items to categorize"),
  }),

  execute: async ({ lineItems }) => {
    const categorized = {
      revenue: [] as { label: string; value: number }[],
      expenses: [] as { label: string; value: number }[],
      adjustments: [] as { label: string; value: number }[],
      uncategorized: [] as { label: string; value: number }[],
    };

    // Keywords for categorization hints (agent makes final decision)
    const hints = {
      revenue: ["rent", "income", "fee", "parking", "laundry", "revenue"],
      expenses: ["tax", "insurance", "utility", "maintenance", "repair", "management"],
      adjustments: ["reserve", "capital", "deferred", "vacancy", "adjustment"],
    };

    for (const item of lineItems) {
      const labelLower = item.label.toLowerCase();
      let category = "uncategorized";

      for (const [cat, keywords] of Object.entries(hints)) {
        if (keywords.some((kw) => labelLower.includes(kw))) {
          category = cat;
          break;
        }
      }

      categorized[category as keyof typeof categorized].push({
        label: item.label,
        value: item.value,
      });
    }

    return {
      success: true,
      categorized,
      summary: {
        revenueCount: categorized.revenue.length,
        expensesCount: categorized.expenses.length,
        adjustmentsCount: categorized.adjustments.length,
        uncategorizedCount: categorized.uncategorized.length,
      },
    };
  },
});
```

### validateExtraction Tool

```typescript
export const validateExtractionTool = tool({
  description: `Validate extracted financial data for consistency and completeness.

  Checks:
  - Sum verification (line items match totals if provided)
  - Category completeness (at least revenue and expenses)
  - Value reasonableness (no negative revenue, etc.)
  - Duplicate detection`,

  inputSchema: z.object({
    model: z.object({
      annualOperatingRevenue: z.record(z.number()),
      annualOperatingExpenses: z.record(z.number()),
      oneTimeAdjustment: z.record(z.number()),
    }).describe("The DirectCapitalizationRateModel to validate"),
    expectedTotals: z.object({
      totalRevenue: z.number().optional(),
      totalExpenses: z.number().optional(),
    }).optional().describe("Expected totals from document for verification"),
  }),

  execute: async ({ model, expectedTotals }) => {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Calculate sums
    const revenueSum = Object.values(model.annualOperatingRevenue)
      .reduce((a, b) => a + b, 0);
    const expenseSum = Object.values(model.annualOperatingExpenses)
      .reduce((a, b) => a + b, 0);
    const adjustmentSum = Object.values(model.oneTimeAdjustment)
      .reduce((a, b) => a + b, 0);

    // Check for negative revenue
    for (const [label, value] of Object.entries(model.annualOperatingRevenue)) {
      if (value < 0) {
        issues.push(`Negative revenue: ${label} = ${value}`);
      }
    }

    // Check category completeness
    if (Object.keys(model.annualOperatingRevenue).length === 0) {
      warnings.push("No revenue items extracted");
    }
    if (Object.keys(model.annualOperatingExpenses).length === 0) {
      warnings.push("No expense items extracted");
    }

    // Verify against expected totals
    if (expectedTotals?.totalRevenue) {
      const diff = Math.abs(revenueSum - expectedTotals.totalRevenue);
      if (diff > 1) {  // Allow $1 rounding difference
        issues.push(`Revenue sum (${revenueSum}) doesn't match expected (${expectedTotals.totalRevenue})`);
      }
    }

    return {
      success: issues.length === 0,
      isValid: issues.length === 0,
      issues,
      warnings,
      calculations: {
        totalRevenue: revenueSum,
        totalExpenses: expenseSum,
        totalAdjustments: adjustmentSum,
        netOperatingIncome: revenueSum - expenseSum,
      },
    };
  },
});
```

## Prompt Engineering

### System Prompt Guidelines

Keep system prompts **under 500 tokens** (sent with every request).

```typescript
// src/ai/prompts/extraction-prompt.ts

export function getExtractionSystemPrompt(): string {
  return `You are a financial document analyst specializing in commercial real estate.

Your task: Extract financial data and output a DirectCapitalizationRateModel.

Output structure:
- annualOperatingRevenue: All income items (rent, fees, etc.)
- annualOperatingExpenses: All operating costs (taxes, insurance, etc.)
- oneTimeAdjustment: Non-recurring items (capital reserves, deferred maintenance)

Guidelines:
1. Use tools to extract and categorize data
2. Provide reasoning for your categorization decisions
3. Flag any ambiguous items for review
4. Ensure all values are annual amounts

Be thorough but efficient. Extract all relevant financial data.`;
}
```

### User Prompt Template

```typescript
export function buildExtractionPrompt(content: string, fileName: string): string {
  return `Analyze this financial document and extract all line items.

Document: ${fileName}

Content:
${content}

Instructions:
1. Use extractFinancialData to identify all financial line items
2. Use categorizeLineItems to classify each as revenue, expense, or adjustment
3. Use validateExtraction to verify your categorization
4. Provide your reasoning for the agentReasoning field

Return the complete DirectCapitalizationRateModel.`;
}
```

### Prompt Token Budget

| Component | Token Budget | Notes |
|-----------|-------------|-------|
| System prompt | <500 | Sent with every request |
| Tool descriptions | <200 each | Only sent when considering tool |
| User prompt | Variable | Include document content |
| Reserved for response | ~4000 | Agent reasoning + structured output |

## Error Handling in Agents

### Tool Error Pattern

```typescript
execute: async (input) => {
  try {
    const result = await doWork(input);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Return error, don't throw
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      context: {
        input: JSON.stringify(input).slice(0, 100),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
```

### Agent-Level Error Handling

```typescript
export async function runFinancialExtractionAgent(
  parsedContent: string,
  fileName: string
): Promise<DirectCapResult> {
  try {
    const result = await generateText({ ... });

    // Check if extraction was successful
    if (!hasValidOutput(result)) {
      throw new ExtractionError("Agent failed to produce valid output", {
        steps: result.steps?.length,
        lastToolCall: result.toolCalls?.slice(-1)[0],
      });
    }

    return extractModelFromResult(result);

  } catch (error) {
    if (error instanceof ExtractionError) {
      throw error;
    }
    throw new ExtractionError(
      `Agent failed: ${error instanceof Error ? error.message : "Unknown"}`,
      { fileName, contentLength: parsedContent.length }
    );
  }
}
```

## Financial Domain Knowledge

### Revenue Categories

| Category | Examples | Notes |
|----------|----------|-------|
| Rental Income | Base rent, Additional rent | Primary income source |
| Parking | Monthly parking, Transient parking | Common in commercial |
| Other Income | Laundry, Vending, Storage | Ancillary income |
| Reimbursements | CAM recoveries, Tax recoveries | Pass-through to tenants |

### Expense Categories

| Category | Examples | Notes |
|----------|----------|-------|
| Property Tax | Real estate tax, Special assessments | Major expense |
| Insurance | Property insurance, Liability | Required coverage |
| Utilities | Electric, Gas, Water, Trash | May be partial reimbursement |
| Maintenance | Repairs, Landscaping, Janitorial | Ongoing costs |
| Management | Property management fee | Usually % of revenue |
| Professional | Legal, Accounting, Consulting | As-needed services |

### Adjustment Categories

| Category | Examples | Notes |
|----------|----------|-------|
| Capital Reserves | Replacement reserves | For future capital items |
| Vacancy | Vacancy allowance | Expected vacancy loss |
| Deferred Maintenance | Backlog repairs | One-time catch-up |
| Capital Improvements | Roof replacement, HVAC | Non-recurring capital |

## Testing Agents

### Mock Tool Responses

```typescript
import { vi } from "vitest";

const mockExtractTool = vi.fn().mockResolvedValue({
  success: true,
  lineItems: [
    { label: "Rental Income", value: 120000 },
    { label: "Property Tax", value: 15000 },
  ],
});
```

### Agent Integration Tests

```typescript
describe("Financial Extraction Agent", () => {
  it("should handle rent roll documents", async () => {
    const content = `
      Rent Roll Summary
      Unit 101: $1,200/month = $14,400/year
      Unit 102: $1,100/month = $13,200/year
      Total Rental Income: $27,600
    `;

    const result = await runFinancialExtractionAgent(content, "rent-roll.txt");

    expect(result.model.annualOperatingRevenue["Rental Income"]).toBe(27600);
    expect(result.model.agentReasoning).toContain("rent");
  });

  it("should handle empty documents gracefully", async () => {
    const result = await runFinancialExtractionAgent("", "empty.txt");

    expect(result.model.agentReasoning).toContain("empty");
    expect(Object.keys(result.model.annualOperatingRevenue)).toHaveLength(0);
  });
});
```

## Performance Optimization

### Reduce Token Usage

1. **Chunk large documents**: Split into sections, process relevant parts
2. **Pre-filter content**: Remove headers/footers before sending to agent
3. **Use focused extraction**: Set `focusArea` parameter when appropriate

### Reduce Latency

1. **Parallel parsing**: Parse file while preparing prompts
2. **Stream results**: Use streaming for long operations
3. **Cache schemas**: Claude caches schemas for 24 hours

### Cost Optimization

1. **Use Batch API**: 50% discount for non-urgent processing
2. **Model selection**: Use Haiku for simple docs, Sonnet for complex
3. **Prompt caching**: 90% discount on repeated prompts

## Debugging Agents

### Enable Detailed Logging

```typescript
const result = await generateText({
  model: aiModel,
  tools: { ... },
  onStepStart: (step) => {
    console.log(`Step ${step.stepNumber}: Starting`);
  },
  onStepFinish: (step) => {
    console.log(`Step ${step.stepNumber}: ${step.toolCalls?.length} tool calls`);
  },
});
```

### Inspect Tool Calls

```typescript
// After generation
for (const step of result.steps) {
  console.log(`Step ${step.stepNumber}:`);
  for (const toolCall of step.toolCalls) {
    console.log(`  Tool: ${toolCall.toolName}`);
    console.log(`  Input: ${JSON.stringify(toolCall.args)}`);
    console.log(`  Result: ${JSON.stringify(toolCall.result)}`);
  }
}
```

## Best Practices Summary

1. **Agents decide, tools execute** - Keep heuristics in agent reasoning
2. **Structured tool returns** - Always return `{ success, data/error }`
3. **Token budget awareness** - Keep system prompts lean
4. **Domain knowledge in prompts** - Not hard-coded in tools
5. **Graceful error handling** - Tools return errors, don't throw
6. **Comprehensive testing** - Test edge cases and empty inputs
7. **Performance monitoring** - Track tokens, latency, costs
