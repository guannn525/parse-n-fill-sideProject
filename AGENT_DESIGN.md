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
  if (content.includes("apt")) {
    return { category: "Residential" };
  }
  // This misses edge cases like "apt-style offices"
}

// GOOD: Tool returns data, agent decides
execute: async ({ content }) => {
  // Return all matches, let agent categorize
  const matches = extractAllRevenueRows(content);
  return { matches, metadata: { count: matches.length } };
}
```

## Agent Architecture

### Revenue Extraction Agent

The main agent orchestrates rent roll parsing through multi-step reasoning.

```typescript
import { generateText } from "ai";
import { aiModel, AI_CONFIG } from "../ai/config";

export async function runRevenueExtractionAgent(
  parsedContent: string,
  fileName: string
): Promise<ParseResult> {
  const startTime = Date.now();

  const result = await generateText({
    model: aiModel,
    maxSteps: AI_CONFIG.maxSteps,
    tools: {
      extractRevenueRows: extractRevenueRowsTool,
      categorizeRevenueStreams: categorizeRevenueStreamsTool,
      validateExtraction: validateExtractionTool,
    },
    system: getExtractionSystemPrompt(),
    prompt: buildExtractionPrompt(parsedContent, fileName),
  });

  return {
    revenueStreams: extractStreamsFromResult(result),
    metadata: {
      sourceFileName: fileName,
      processingTimeMs: Date.now() - startTime,
      confidence: calculateConfidence(result),
      agentReasoning: extractReasoning(result),
    },
  };
}
```

### Orchestration Flow

```
Step 1: extractRevenueRows
   ↓
   Agent analyzes extracted unit data
   ↓
Step 2: categorizeRevenueStreams
   ↓
   Agent groups rows into Residential/Commercial/Miscellaneous
   ↓
Step 3: validateExtraction
   ↓
   Agent confirms or corrects
   ↓
Final: RevenueStream[] output
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

### extractRevenueRows Tool

```typescript
export const extractRevenueRowsTool = tool({
  description: `Extract revenue row data from parsed rent roll content.

  Identifies:
  - Unit identifiers: apartment numbers, suite numbers, space IDs
  - Square footage: unit SF, rentable SF
  - Monthly rates: base rent, monthly rent amounts
  - Annual income: yearly totals or calculated from monthly
  - Vacancy status: occupied/vacant indicators
  - Tenant names: lessee names, tenant info

  Returns all identified rows with their data fields.
  Does NOT categorize - that's for the categorizeRevenueStreams tool.`,

  inputSchema: z.object({
    content: z.string().describe("Parsed document text content"),
    focusArea: z.enum(["Residential", "Commercial", "Miscellaneous", "all"])
      .default("all")
      .describe("Focus extraction on specific category"),
  }),

  execute: async ({ content, focusArea }) => {
    const rows = [];

    // Pattern matching for rent roll data
    const patterns = {
      unit: /(?:Unit|Apt|Suite|Space)\s*[#:]?\s*(\w+)/gi,
      sqft: /(\d{3,5})\s*(?:SF|sq\.?\s*ft)/gi,
      monthly: /\$[\d,]+(?:\.\d{2})?\s*(?:\/?\s*(?:mo|month))?/gi,
      tenant: /Tenant:\s*([^,\n]+)/gi,
    };

    // Extract matches - simplified example
    // Real implementation would be more sophisticated

    return {
      success: true,
      rows,
      totalFound: rows.length,
      focusArea,
    };
  },
});
```

### categorizeRevenueStreams Tool

```typescript
export const categorizeRevenueStreamsTool = tool({
  description: `Categorize revenue rows into streams by property type.

  Categories:
  - RESIDENTIAL: Apartments, multifamily units, residential rentals
  - COMMERCIAL: Office, retail, industrial, mixed-use commercial
  - MISCELLANEOUS: Parking, storage, laundry, vending, other income

  Groups rows into RevenueStream objects by category.
  Uses commercial real estate domain knowledge for categorization.`,

  inputSchema: z.object({
    rows: z.array(z.object({
      unit: z.string(),
      squareFeet: z.number().nullable(),
      monthlyRate: z.number().nullable(),
      tenantName: z.string().optional(),
      context: z.string().optional(),
    })).describe("Revenue rows to categorize"),
  }),

  execute: async ({ rows }) => {
    const streams = {
      Residential: [] as RevenueRow[],
      Commercial: [] as RevenueRow[],
      Miscellaneous: [] as RevenueRow[],
    };

    // Category hints (agent makes final decision)
    const hints = {
      Residential: ["apt", "unit", "bedroom", "br", "apartment", "residential"],
      Commercial: ["suite", "office", "retail", "commercial", "floor"],
      Miscellaneous: ["parking", "storage", "laundry", "vending", "misc"],
    };

    for (const row of rows) {
      const unitLower = row.unit.toLowerCase();
      let category: keyof typeof streams = "Miscellaneous";

      for (const [cat, keywords] of Object.entries(hints)) {
        if (keywords.some((kw) => unitLower.includes(kw))) {
          category = cat as keyof typeof streams;
          break;
        }
      }

      streams[category].push({
        id: crypto.randomUUID(),
        ...row,
        annualIncome: row.monthlyRate ? row.monthlyRate * 12 : null,
        isVacant: !row.tenantName,
        operatingVacancyAndCreditLoss: 5, // Default 5%
      });
    }

    return {
      success: true,
      streams: Object.entries(streams)
        .filter(([_, rows]) => rows.length > 0)
        .map(([category, rows], index) => ({
          id: crypto.randomUUID(),
          name: category === "Miscellaneous" ? "Other Income" : `${category} Rents`,
          category,
          order: index + 1,
          rows,
        })),
      summary: {
        residentialCount: streams.Residential.length,
        commercialCount: streams.Commercial.length,
        miscellaneousCount: streams.Miscellaneous.length,
      },
    };
  },
});
```

### validateExtraction Tool

```typescript
export const validateExtractionTool = tool({
  description: `Validate extracted revenue streams for consistency and completeness.

  Checks:
  - Sum verification (row totals match stream totals if provided)
  - Data completeness (each row has unit + at least one value)
  - Value reasonableness (no negative rents, realistic SF ranges)
  - Duplicate detection (same unit appearing twice)`,

  inputSchema: z.object({
    streams: z.array(z.object({
      id: z.string(),
      name: z.string(),
      category: z.enum(["Residential", "Commercial", "Miscellaneous"]),
      rows: z.array(z.object({
        unit: z.string(),
        squareFeet: z.number().nullable(),
        monthlyRate: z.number().nullable(),
        annualIncome: z.number().nullable(),
      })),
    })).describe("The RevenueStream[] to validate"),
    expectedTotals: z.object({
      totalGrossRevenue: z.number().optional(),
      totalUnits: z.number().optional(),
    }).optional().describe("Expected totals from document for verification"),
  }),

  execute: async ({ streams, expectedTotals }) => {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Calculate totals
    let totalUnits = 0;
    let totalGrossRevenue = 0;

    for (const stream of streams) {
      for (const row of stream.rows) {
        totalUnits++;
        if (row.annualIncome) {
          totalGrossRevenue += row.annualIncome;
        }

        // Check for negative values
        if (row.monthlyRate && row.monthlyRate < 0) {
          issues.push(`Negative rent: ${row.unit} = $${row.monthlyRate}`);
        }

        // Check for unrealistic SF
        if (row.squareFeet && (row.squareFeet < 50 || row.squareFeet > 100000)) {
          warnings.push(`Unusual SF: ${row.unit} = ${row.squareFeet} SF`);
        }
      }
    }

    // Check completeness
    if (totalUnits === 0) {
      warnings.push("No revenue rows extracted");
    }

    // Verify against expected totals
    if (expectedTotals?.totalUnits) {
      if (totalUnits !== expectedTotals.totalUnits) {
        issues.push(`Unit count (${totalUnits}) doesn't match expected (${expectedTotals.totalUnits})`);
      }
    }

    if (expectedTotals?.totalGrossRevenue) {
      const diff = Math.abs(totalGrossRevenue - expectedTotals.totalGrossRevenue);
      if (diff > 1) {
        issues.push(`Revenue sum ($${totalGrossRevenue}) doesn't match expected ($${expectedTotals.totalGrossRevenue})`);
      }
    }

    return {
      success: issues.length === 0,
      isValid: issues.length === 0,
      issues,
      warnings,
      calculations: {
        totalUnits,
        totalGrossRevenue,
        streamCount: streams.length,
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
  return `You are a rent roll analyst specializing in commercial real estate.

Your task: Extract unit-level revenue data and output RevenueStream[] format.

Output structure:
- RevenueStream[]: Array of categorized revenue streams
  - Each stream has: id, name, category, rows[], totals
  - Categories: Residential, Commercial, Miscellaneous
- Each RevenueRow has: unit, squareFeet, monthlyRate, annualIncome, isVacant, tenantName

Guidelines:
1. Use tools to extract and categorize data
2. Provide reasoning for your categorization decisions
3. Flag any ambiguous items for review
4. Calculate annualIncome as monthlyRate * 12

Be thorough but efficient. Extract all unit-level revenue data.`;
}
```

### User Prompt Template

```typescript
export function buildExtractionPrompt(content: string, fileName: string): string {
  return `Analyze this rent roll and extract all revenue data.

Document: ${fileName}

Content:
${content}

Instructions:
1. Use extractRevenueRows to identify all unit/lease data
2. Use categorizeRevenueStreams to group by Residential/Commercial/Miscellaneous
3. Use validateExtraction to verify your extraction
4. Provide reasoning for how you categorized each stream

Return the complete RevenueStream[] array.`;
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
export async function runRevenueExtractionAgent(
  parsedContent: string,
  fileName: string
): Promise<ParseResult> {
  try {
    const result = await generateText({ ... });

    // Check if extraction was successful
    if (!hasValidOutput(result)) {
      throw new ExtractionError("Agent failed to produce valid output", {
        steps: result.steps?.length,
        lastToolCall: result.toolCalls?.slice(-1)[0],
      });
    }

    return extractResultFromResponse(result);

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

## Revenue Domain Knowledge

### Revenue Stream Categories

| Category | Examples | Indicators |
|----------|----------|------------|
| Residential | Apartments, Units, Bedrooms | "Apt", "Unit", "BR", "Bedroom" |
| Commercial | Offices, Retail, Suites | "Suite", "Office", "Floor", "Retail" |
| Miscellaneous | Parking, Storage, Laundry | "Parking", "Storage", "Laundry" |

### Common Rent Roll Fields

| Field | Examples | Notes |
|-------|----------|-------|
| Unit ID | Apt 1A, Suite 200, Space 101 | Primary identifier |
| Square Feet | 850 SF, 1,200 sq ft | Rentable area |
| Monthly Rent | $1,500/mo, $2,000 | Base rent amount |
| Tenant Name | John Smith, ABC Corp | Occupancy indicator |
| Lease Expiry | 12/31/2025, Dec 2025 | Lease term info |
| Vacancy Status | Vacant, Occupied | Explicit or inferred |

### Calculated Fields

| Field | Formula | Notes |
|-------|---------|-------|
| Annual Income | monthlyRate * 12 | Gross annual |
| Effective Income | annualIncome * (1 - vacancyRate/100) | After vacancy |
| Rent/SF | monthlyRate / squareFeet | Unit economics |

## Testing Agents

### Mock Tool Responses

```typescript
import { vi } from "vitest";

const mockExtractTool = vi.fn().mockResolvedValue({
  success: true,
  rows: [
    { unit: "Apt 1A", squareFeet: 850, monthlyRate: 1500, tenantName: "John Smith" },
    { unit: "Apt 1B", squareFeet: 900, monthlyRate: 1600, tenantName: null },
  ],
});
```

### Agent Integration Tests

```typescript
describe("Revenue Extraction Agent", () => {
  it("should handle rent roll documents", async () => {
    const content = `
      Rent Roll Summary
      Unit 101: $1,200/month, 850 SF, John Smith
      Unit 102: $1,100/month, 800 SF, Jane Doe
      Total: $2,300/month
    `;

    const result = await runRevenueExtractionAgent(content, "rent-roll.txt");

    expect(result.revenueStreams).toHaveLength(1);
    expect(result.revenueStreams[0].rows).toHaveLength(2);
    expect(result.revenueStreams[0].category).toBe("Residential");
  });

  it("should handle empty documents gracefully", async () => {
    const result = await runRevenueExtractionAgent("", "empty.txt");

    expect(result.metadata.agentReasoning).toContain("empty");
    expect(result.revenueStreams).toHaveLength(0);
  });

  it("should categorize mixed-use properties", async () => {
    const content = `
      Mixed-Use Property Rent Roll
      Suite 100 (Retail): $3,000/mo, ABC Store
      Suite 200 (Office): $2,500/mo, XYZ Corp
      Apt 1A: $1,500/mo, John Smith
      Parking Space 1: $100/mo, John Smith
    `;

    const result = await runRevenueExtractionAgent(content, "mixed-use.txt");

    expect(result.revenueStreams.length).toBeGreaterThanOrEqual(2);
    expect(result.revenueStreams.some(s => s.category === "Commercial")).toBe(true);
    expect(result.revenueStreams.some(s => s.category === "Residential")).toBe(true);
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
