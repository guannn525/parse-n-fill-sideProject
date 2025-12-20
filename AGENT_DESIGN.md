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
};

// GOOD: Tool returns data, agent decides
execute: async ({ content }) => {
  // Return all matches, let agent categorize
  const matches = extractAllRevenueRows(content);
  return { matches, metadata: { count: matches.length } };
};
```

## Agent Architecture

### Revenue Extraction Agent

The main agent orchestrates rent roll parsing using `generateObject` for structured output.

```typescript
import { executeRevenueStreamExtraction } from "../ai/tools";
import { parseFile } from "../parsers";

export async function extractRevenueFromDocument(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractionResult> {
  const startTime = Date.now();

  // Parse file to get text content
  const parsed = await parseFile({ buffer: fileBuffer, fileName, mimeType });

  // Extract revenue streams using AI
  const result = await executeRevenueStreamExtraction({
    rawText: parsed.rawText,
    structuredData: parsed.structuredData,
    fileName,
  });

  return {
    success: result.success,
    revenueStreams: result.revenueStreams,
    metadata: {
      sourceFileName: fileName,
      processingTimeMs: Date.now() - startTime,
      confidence: result.overallConfidence,
      reasoning: result.reasoning,
    },
  };
}
```

### Orchestration Flow

```
Step 1: parseFile (PDF/Excel/CSV/Image)
   ↓
   Returns ParsedContent with rawText and structuredData
   ↓
Step 2: executeRevenueStreamExtraction
   ↓
   AI extracts unit data AND categorizes into streams
   (Residential/Commercial/Miscellaneous)
   ↓
Final: RevenueStream[] output with confidence and reasoning
```

**Design Note:** The implementation uses a single `extractRevenueStreams` tool that handles both extraction and categorization in one step using `generateObject` with Zod schemas. This is more efficient and reliable than multi-tool orchestration.

## Tool Definitions

### Tool Design Pattern

All tools follow the Vercel AI SDK pattern with structured error handling:

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

### extractRevenueStreams Tool (Actual Implementation)

The primary tool for rent roll extraction. Uses `generateObject` for structured output:

```typescript
import { tool, generateObject } from "ai";
import { getModel, AI_CONFIG } from "../config";
import {
  extractRevenueStreamsInputSchema,
  extractRevenueStreamsOutputSchema,
} from "./revenue-stream-types";

export const extractRevenueStreams = tool({
  description: `Extract revenue data from rent roll documents into RevenueStream[] format.

  Call this tool with parsed document content to extract unit-level revenue data.

  Returns:
  - RevenueStream[]: Categorized streams (Residential/Commercial/Miscellaneous)
  - Each stream contains RevenueRow[] with unit, sqft, rent data
  - Confidence scores and extraction reasoning

  Best practices:
  - Include rawText from parser output
  - Include structuredData if available (Excel/CSV)
  - Provide propertyTypeHint when known (improves categorization)`,

  inputSchema: extractRevenueStreamsInputSchema,

  execute: async (input) => {
    try {
      const { rawText, structuredData, fileName, propertyTypeHint } = input;

      // Handle empty input
      if (!rawText || rawText.trim().length === 0) {
        return {
          success: true,
          revenueStreams: [],
          overallConfidence: 0,
          reasoning: "No content to extract from document",
          warnings: ["Document appears to be empty"],
        };
      }

      // Select model based on complexity
      const complexity = rawText.length > 10000 ? "complex" : "standard";
      const model = getModel(complexity);

      // Use generateObject for structured extraction
      const { object } = await generateObject({
        model,
        schema: extractRevenueStreamsOutputSchema,
        system: getRevenueStreamSystemPrompt(),
        prompt: buildRevenueStreamPrompt(rawText, fileName, propertyTypeHint),
        temperature: AI_CONFIG.temperature,
      });

      return {
        success: true,
        revenueStreams: object.revenueStreams,
        overallConfidence: object.overallConfidence,
        reasoning: object.reasoning,
        warnings: object.warnings,
      };
    } catch (error) {
      return {
        success: false,
        revenueStreams: [],
        overallConfidence: 0,
        reasoning: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
```

### Input/Output Schemas (Zod)

Located in `src/ai/tools/revenue-stream-types.ts`:

```typescript
import { z } from "zod";

export const revenueRowSchema = z.object({
  id: z.string(),
  unit: z.string(),
  squareFeet: z.number().nullable(),
  monthlyRate: z.number().nullable(),
  annualIncome: z.number().nullable(),
  isVacant: z.boolean(),
});

export const revenueStreamSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["Residential", "Commercial", "Miscellaneous"]),
  order: z.number(),
  rows: z.array(revenueRowSchema),
});

export const extractRevenueStreamsInputSchema = z.object({
  rawText: z.string().describe("Parsed document text content"),
  structuredData: z.unknown().optional().describe("Structured data from Excel/CSV"),
  fileName: z.string().describe("Original filename"),
  documentTypeHint: z.string().optional(),
  propertyTypeHint: z.string().optional(),
});

export const extractRevenueStreamsOutputSchema = z.object({
  revenueStreams: z.array(revenueStreamSchema),
  overallConfidence: z.number().min(0).max(1),
  reasoning: z.string(),
  warnings: z.array(z.string()).optional(),
});
```

## Prompt Engineering

### System Prompt Guidelines

Keep system prompts **under 500 tokens** (sent with every request).

```typescript
// src/ai/prompts/revenue-stream-prompt.ts

export function getRevenueStreamSystemPrompt(): string {
  return `You are a rent roll analyst for commercial real estate. Extract unit-level revenue data into RevenueStream[] format.

**Output Structure:**
- RevenueStream[]: Array of categorized revenue streams
  - id: Generate a unique identifier (e.g., "stream-1")
  - name: Descriptive name (e.g., "Office Rents", "Parking")
  - category: Residential | Commercial | Miscellaneous
  - order: Display order starting at 1
  - rows: Array of RevenueRow (unit-level data)

**Categories:**
- RESIDENTIAL: Apartments, units, multifamily, residential rentals
- COMMERCIAL: Office, retail, industrial, flex, warehouse, medical
- MISCELLANEOUS: Parking, storage, laundry, vending, antenna, billboard, other

**RevenueRow Fields:**
- id, unit, squareFeet, monthlyRate, annualIncome, isVacant

**Guidelines:**
1. Extract ALL units/spaces from the document
2. Group units into logical revenue streams by type
3. Use null for missing values, not 0`;
}
```

### User Prompt Template

```typescript
export function buildRevenueStreamPrompt(
  content: string,
  fileName: string,
  propertyTypeHint?: string
): string {
  return `Extract all revenue data from this rent roll into RevenueStream[] format.

**Document:** ${fileName}
${propertyTypeHint ? `**Property Type:** ${propertyTypeHint}` : ""}

**Content:**
${content}

**Instructions:**
1. Identify all unit/lease records in the document
2. Extract for each unit: unit ID, square feet, monthly rent, annual rent
3. Determine if each unit is vacant (no tenant or no rent = vacant)
4. Group rows into streams by category (Residential/Commercial/Miscellaneous)
5. Provide reasoning explaining your categorization decisions`;
}
```

### Prompt Token Budget

| Component             | Token Budget | Notes                               |
| --------------------- | ------------ | ----------------------------------- |
| System prompt         | <500         | Sent with every request             |
| Tool descriptions     | <200 each    | Only sent when considering tool     |
| User prompt           | Variable     | Include document content            |
| Reserved for response | ~4000        | Agent reasoning + structured output |

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
};
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

| Category      | Examples                    | Indicators                           |
| ------------- | --------------------------- | ------------------------------------ |
| Residential   | Apartments, Units, Bedrooms | "Apt", "Unit", "BR", "Bedroom"       |
| Commercial    | Offices, Retail, Suites     | "Suite", "Office", "Floor", "Retail" |
| Miscellaneous | Parking, Storage, Laundry   | "Parking", "Storage", "Laundry"      |

### Common Rent Roll Fields

| Field          | Examples                     | Notes                |
| -------------- | ---------------------------- | -------------------- |
| Unit ID        | Apt 1A, Suite 200, Space 101 | Primary identifier   |
| Square Feet    | 850 SF, 1,200 sq ft          | Rentable area        |
| Monthly Rent   | $1,500/mo, $2,000            | Base rent amount     |
| Tenant Name    | John Smith, ABC Corp         | Occupancy indicator  |
| Lease Expiry   | 12/31/2025, Dec 2025         | Lease term info      |
| Vacancy Status | Vacant, Occupied             | Explicit or inferred |

### Calculated Fields

| Field            | Formula                               | Notes          |
| ---------------- | ------------------------------------- | -------------- |
| Annual Income    | monthlyRate \* 12                     | Gross annual   |
| Effective Income | annualIncome \* (1 - vacancyRate/100) | After vacancy  |
| Rent/SF          | monthlyRate / squareFeet              | Unit economics |

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
    expect(result.revenueStreams.some((s) => s.category === "Commercial")).toBe(true);
    expect(result.revenueStreams.some((s) => s.category === "Residential")).toBe(true);
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
3. **Schema validation**: Zod schemas enable structured output with `generateObject`

### Cost Optimization

1. **Model selection**: Use Gemini Flash for simple docs, Gemini Pro for complex
2. **Complexity detection**: Automatically choose model based on document size
3. **Structured output**: Use `generateObject` to reduce token waste

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
