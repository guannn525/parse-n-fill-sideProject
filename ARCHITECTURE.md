# ARCHITECTURE.md

Technical architecture documentation for PARSE-N-FILL.

## System Overview

PARSE-N-FILL is a modular financial document parsing system that uses Claude AI to extract structured data from various document formats and output a standardized Direct Capitalization Rate Model.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PARSE-N-FILL System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   Input     │    │   Parser    │    │      AI Agent           │ │
│  │  Documents  │───▶│   Layer     │───▶│  (Claude Sonnet 4.5)    │ │
│  │             │    │             │    │                         │ │
│  │  • PDF      │    │  • Vision   │    │  • Extract line items   │ │
│  │  • Excel    │    │  • ExcelJS  │    │  • Categorize items     │ │
│  │  • CSV      │    │  • PapaParse│    │  • Generate reasoning   │ │
│  │  • Images   │    │             │    │                         │ │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘ │
│                                                     │               │
│                                                     ▼               │
│                     ┌─────────────────────────────────────────────┐ │
│                     │         DirectCapitalizationRateModel       │ │
│                     │                                             │ │
│                     │  • timeStamp                                │ │
│                     │  • agentReasoning                           │ │
│                     │  • annualOperatingRevenue                   │ │
│                     │  • annualOperatingExpenses                  │ │
│                     │  • oneTimeAdjustment                        │ │
│                     └───────────────────────┬─────────────────────┘ │
│                                             │                       │
│                                             ▼                       │
│                     ┌─────────────────────────────────────────────┐ │
│                     │            Excel Export (ExcelJS)           │ │
│                     │                                             │ │
│                     │  Sheet 1: Summary                           │ │
│                     │  Sheet 2: Revenue Detail                    │ │
│                     │  Sheet 3: Expense Detail                    │ │
│                     │  Sheet 4: Adjustments                       │ │
│                     │  Sheet 5: Calculations (with formulas)      │ │
│                     └─────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
parse-n-fill/
├── src/
│   ├── index.ts                    # Main entry point, public exports
│   │
│   ├── types/                      # TypeScript type definitions
│   │   ├── index.ts                # Re-exports
│   │   ├── direct-cap-model.ts     # Core model interfaces
│   │   ├── file-types.ts           # File/MIME type constants
│   │   └── api-types.ts            # Request/response types
│   │
│   ├── schemas/                    # Zod validation schemas
│   │   ├── index.ts                # Re-exports
│   │   ├── direct-cap-schema.ts    # Model validation
│   │   └── request-schema.ts       # API request validation
│   │
│   ├── parsers/                    # File parsing layer
│   │   ├── index.ts                # Parser factory
│   │   ├── pdf-parser.ts           # PDF via Claude vision
│   │   ├── excel-parser.ts         # Excel via ExcelJS
│   │   ├── csv-parser.ts           # CSV via PapaParse
│   │   └── image-parser.ts         # Images via Claude vision
│   │
│   ├── ai/                         # AI integration layer
│   │   ├── index.ts                # AI module exports
│   │   ├── config.ts               # Model configuration
│   │   ├── prompts/                # System prompts
│   │   │   ├── index.ts
│   │   │   ├── extraction-prompt.ts
│   │   │   └── categorization-prompt.ts
│   │   └── tools/                  # AI agent tools
│   │       ├── index.ts
│   │       ├── extract-financial-data.ts
│   │       ├── categorize-line-items.ts
│   │       └── validate-extraction.ts
│   │
│   ├── agent/                      # Agent orchestration
│   │   ├── index.ts
│   │   └── financial-extraction-agent.ts
│   │
│   ├── export/                     # Export functionality
│   │   ├── index.ts
│   │   ├── excel-export.ts         # ExcelJS workbook generation
│   │   └── templates/
│   │       └── direct-cap-template.ts
│   │
│   ├── api/                        # API handlers
│   │   ├── index.ts
│   │   ├── parse-document.ts       # Main parsing endpoint
│   │   └── export-excel.ts         # Excel export endpoint
│   │
│   └── lib/                        # Shared utilities
│       ├── errors.ts               # Custom error classes
│       ├── constants.ts            # Shared constants
│       └── utils.ts                # Utility functions
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
├── README.md
├── CLAUDE.md
├── ARCHITECTURE.md
└── AGENT_DESIGN.md
```

## Component Architecture

### 1. Parser Layer (`src/parsers/`)

The parser layer handles document ingestion and text extraction.

```typescript
// Parser Factory Pattern
interface ParsedContent {
  text: string;                        // Extracted text content
  structured?: Record<string, unknown>[]; // Tabular data if available
  metadata?: {
    pages?: number;
    format?: string;
  };
}

async function parseDocument(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedContent>
```

**Parser Selection Logic:**

| MIME Type | Parser | Method |
|-----------|--------|--------|
| `application/pdf` | pdf-parser | Claude vision (base64) |
| `image/*` | image-parser | Claude vision (base64) |
| `text/csv` | csv-parser | PapaParse |
| `application/vnd.openxmlformats-*` | excel-parser | ExcelJS → PapaParse |

### 2. AI Layer (`src/ai/`)

#### Configuration (`src/ai/config.ts`)

```typescript
import { anthropic } from "@ai-sdk/anthropic";

export const AI_CONFIG = {
  modelId: "claude-sonnet-4-20250514",
  maxSteps: 5,
  temperature: 0,  // Deterministic for financial data
} as const;

export const aiModel = anthropic(AI_CONFIG.modelId);
```

#### Tools (`src/ai/tools/`)

Tools follow the Vercel AI SDK pattern:

```typescript
import { tool } from "ai";
import { z } from "zod";

export const extractFinancialDataTool = tool({
  description: `Extract financial line items from document content.

  Identifies:
  - Revenue items (rent, fees, other income)
  - Expense items (taxes, insurance, maintenance)
  - Adjustment items (capital reserves, deferred maintenance)`,

  inputSchema: z.object({
    content: z.string().describe("Parsed document content"),
    focusArea: z.enum(["revenue", "expenses", "adjustments", "all"]).default("all"),
  }),

  execute: async ({ content, focusArea }) => {
    // Extract line items from content
    return {
      success: true,
      lineItems: [...],
      confidence: 0.85,
    };
  },
});
```

### 3. Agent Layer (`src/agent/`)

The financial extraction agent orchestrates the parsing workflow.

```typescript
import { generateText } from "ai";
import { aiModel, AI_CONFIG } from "../ai/config";
import { extractFinancialDataTool, categorizeLineItemsTool } from "../ai/tools";

export async function runFinancialExtractionAgent(
  parsedContent: string,
  fileName: string
): Promise<DirectCapResult> {
  const result = await generateText({
    model: aiModel,
    maxSteps: AI_CONFIG.maxSteps,
    tools: {
      extractFinancialData: extractFinancialDataTool,
      categorizeLineItems: categorizeLineItemsTool,
    },
    system: getExtractionSystemPrompt(),
    prompt: buildExtractionPrompt(parsedContent, fileName),
  });

  return extractModelFromResult(result);
}
```

### 4. Export Layer (`src/export/`)

Excel workbook generation with formulas:

```typescript
import ExcelJS from "exceljs";

export async function generateExcelWorkbook(
  result: DirectCapResult
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Summary");
  addSummarySheet(summarySheet, result);

  // Sheet 2-4: Detail sheets
  addDetailSheet(workbook, "Revenue", result.model.annualOperatingRevenue);
  addDetailSheet(workbook, "Expenses", result.model.annualOperatingExpenses);
  addDetailSheet(workbook, "Adjustments", result.model.oneTimeAdjustment);

  // Sheet 5: Calculations with Excel formulas
  const calcSheet = workbook.addWorksheet("Calculations");
  calcSheet.getCell("A1").value = "Net Operating Income";
  calcSheet.getCell("B1").value = { formula: "SUM(Revenue!B:B)-SUM(Expenses!B:B)" };

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

## Type Definitions

### Core Types (`src/types/direct-cap-model.ts`)

```typescript
/**
 * Direct Capitalization Rate Model
 * Core output structure for financial document parsing
 */
export interface DirectCapitalizationRateModel {
  /** ISO 8601 timestamp of extraction */
  timeStamp: string;

  /** Agent's reasoning for audit trail */
  agentReasoning: string;

  /** Annual operating revenue line items */
  annualOperatingRevenue: Record<string, number>;

  /** Annual operating expenses line items */
  annualOperatingExpenses: Record<string, number>;

  /** One-time adjustments (positive or negative) */
  oneTimeAdjustment: Record<string, number>;
}

/**
 * Calculated metrics derived from the model
 */
export interface DirectCapCalculations {
  grossPotentialIncome: number;
  effectiveGrossIncome: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  totalAdjustments: number;
  adjustedValue: number | null;
}

/**
 * Complete result with model and calculations
 */
export interface DirectCapResult {
  model: DirectCapitalizationRateModel;
  calculations: DirectCapCalculations;
  metadata: {
    sourceFileName: string;
    sourceFileType: string;
    processingTimeMs: number;
    confidence: number;  // 0-1 score
  };
}
```

### API Types (`src/types/api-types.ts`)

```typescript
export interface ParseDocumentRequest {
  fileName: string;
  fileType: string;
  fileData: string;  // base64
  options?: {
    includeRawText?: boolean;
  };
}

export interface ParseDocumentResponse {
  success: boolean;
  result?: DirectCapResult;
  rawText?: string;
  error?: string;
}

export interface ExportExcelRequest {
  model: DirectCapitalizationRateModel;
  options?: {
    templateName?: "standard" | "detailed";
    includeCharts?: boolean;
  };
}
```

## API Contracts

### POST `/api/parse`

Parse a financial document.

**Request:**
```json
{
  "fileName": "rent-roll.pdf",
  "fileType": "application/pdf",
  "fileData": "base64encodedcontent...",
  "options": {
    "includeRawText": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "model": {
      "timeStamp": "2025-12-12T10:30:00.000Z",
      "agentReasoning": "Extracted 5 revenue items...",
      "annualOperatingRevenue": { "Rental Income": 120000 },
      "annualOperatingExpenses": { "Property Tax": 15000 },
      "oneTimeAdjustment": { "Deferred Maintenance": -5000 }
    },
    "calculations": {
      "grossPotentialIncome": 127400,
      "totalOperatingExpenses": 41000,
      "netOperatingIncome": 86400
    },
    "metadata": {
      "sourceFileName": "rent-roll.pdf",
      "processingTimeMs": 2340,
      "confidence": 0.92
    }
  }
}
```

### POST `/api/export`

Export model to Excel.

**Request:**
```json
{
  "model": { ... DirectCapitalizationRateModel },
  "options": {
    "templateName": "standard",
    "includeCharts": true
  }
}
```

**Response:** Binary Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

## Integration Patterns

### MAP05 Integration

```typescript
// MAP05: src/app/api/parse-financial/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseDocument } from "parse-n-fill";

export async function POST(request: NextRequest) {
  // Auth check (Supabase)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await parseDocument(body);

  return NextResponse.json(result);
}
```

### other_branch Integration

```typescript
// other_branch: src/app/api/parse/route.ts
import { auth } from "@clerk/nextjs/server";
import { parseDocument } from "parse-n-fill";

export async function POST(request: Request) {
  // Auth check (Clerk)
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const result = await parseDocument(body);

  return Response.json(result);
}
```

## Error Handling

### Custom Error Classes (`src/lib/errors.ts`)

```typescript
export class ParseNFillError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ParseNFillError";
  }
}

export class ParsingError extends ParseNFillError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "PARSING_ERROR", details);
  }
}

export class ExtractionError extends ParseNFillError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "EXTRACTION_ERROR", details);
  }
}

export class ExportError extends ParseNFillError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "EXPORT_ERROR", details);
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Failed to parse document",
  "code": "PARSING_ERROR",
  "details": {
    "fileType": "application/pdf",
    "reason": "Document appears to be encrypted"
  }
}
```

## Performance Considerations

### Token Optimization

- **System prompts**: Keep under 500 tokens (sent with every request)
- **Tool descriptions**: Can be longer (only sent when considering tool)
- **Content chunking**: Large documents split into manageable chunks

### Caching Strategy

```typescript
// Consider caching parsed content for repeated queries
interface CacheEntry {
  parsedContent: string;
  model: DirectCapitalizationRateModel;
  expiresAt: number;
}
```

### Rate Limiting

- Claude API: Implement request queuing for high volume
- Consider Batch API for non-urgent processing (50% cost savings)

## Security Considerations

1. **Input Validation**: All inputs validated via Zod schemas
2. **File Size Limits**: 32MB max for PDFs (Claude limit)
3. **MIME Type Validation**: Whitelist-based validation
4. **API Key Protection**: Environment variables, never exposed
5. **No Eval**: All parsing uses safe methods (no `eval()`)

## Testing Strategy

### Unit Tests

```typescript
// src/parsers/pdf-parser.test.ts
import { describe, it, expect } from "vitest";
import { parsePDF } from "./pdf-parser";

describe("PDF Parser", () => {
  it("should extract text from PDF", async () => {
    const buffer = await readFixture("sample-invoice.pdf");
    const result = await parsePDF(buffer, "sample-invoice.pdf");

    expect(result.text).toContain("Invoice");
    expect(result.text.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// src/agent/__tests__/financial-extraction.test.ts
describe("Financial Extraction Agent", () => {
  it("should extract and categorize line items", async () => {
    const content = readFixture("parsed-rent-roll.txt");
    const result = await runFinancialExtractionAgent(content, "rent-roll.pdf");

    expect(result.model.annualOperatingRevenue).toBeDefined();
    expect(Object.keys(result.model.annualOperatingRevenue).length).toBeGreaterThan(0);
  });
});
```

## Future Considerations

1. **Batch Processing**: Support for multiple documents in single request
2. **Template System**: Custom extraction templates for different document types
3. **Webhook Support**: Async processing with completion notifications
4. **Multi-Model**: Fallback to alternative models (GPT-4V, Gemini)
5. **Self-Hosted**: Option to run with local models for data sensitivity
