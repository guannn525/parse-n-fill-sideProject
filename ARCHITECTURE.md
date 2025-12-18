# ARCHITECTURE.md

Technical architecture documentation for PARSE-N-FILL.

## System Overview

PARSE-N-FILL is a modular rent roll parsing system that uses Claude AI to extract structured revenue stream data from various document formats and output RevenueStream[] compatible with income-approach analysis.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PARSE-N-FILL System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   Input     │    │   Parser    │    │      AI Agent           │ │
│  │  Documents  │───▶│   Layer     │───▶│  (Claude Sonnet 4.5)    │ │
│  │             │    │             │    │                         │ │
│  │  • PDF      │    │  • Vision   │    │  • Extract revenue rows │ │
│  │  • Excel    │    │  • ExcelJS  │    │  • Categorize streams   │ │
│  │  • CSV      │    │  • PapaParse│    │  • Generate reasoning   │ │
│  │  • Images   │    │             │    │                         │ │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘ │
│                                                     │               │
│                                                     ▼               │
│                     ┌─────────────────────────────────────────────┐ │
│                     │              RevenueStream[]                │ │
│                     │                                             │ │
│                     │  • id, name, category                       │ │
│                     │  • rows: RevenueRow[]                       │ │
│                     │  • vacancyRate, totals                      │ │
│                     └───────────────────────┬─────────────────────┘ │
│                                             │                       │
│                                             ▼                       │
│                     ┌─────────────────────────────────────────────┐ │
│                     │            Excel Export (ExcelJS)           │ │
│                     │                                             │ │
│                     │  Sheet 1: Summary                           │ │
│                     │  Sheet 2: Residential Revenue               │ │
│                     │  Sheet 3: Commercial Revenue                │ │
│                     │  Sheet 4: Miscellaneous Revenue             │ │
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
│   │   ├── revenue-stream.ts       # Core model interfaces
│   │   ├── file-types.ts           # File/MIME type constants
│   │   └── api-types.ts            # Request/response types
│   │
│   ├── schemas/                    # Zod validation schemas
│   │   ├── index.ts                # Re-exports
│   │   ├── revenue-stream-schema.ts # Model validation
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
│   │       ├── extract-revenue-streams.ts
│   │       ├── categorize-revenue-streams.ts
│   │       └── validate-extraction.ts
│   │
│   ├── agent/                      # Agent orchestration
│   │   ├── index.ts
│   │   └── revenue-extraction-agent.ts
│   │
│   ├── export/                     # Export functionality
│   │   ├── index.ts
│   │   ├── excel-export.ts         # ExcelJS workbook generation
│   │   └── templates/
│   │       └── revenue-template.ts
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

export const extractRevenueStreamsTool = tool({
  description: `Extract revenue data from rent roll content.

  Identifies:
  - Unit identifiers (Apt 1A, Suite 200, etc.)
  - Square footage per unit
  - Monthly rates and annual income
  - Vacancy status and tenant names`,

  inputSchema: z.object({
    content: z.string().describe("Parsed document content"),
    category: z.enum(["Residential", "Commercial", "Miscellaneous", "all"]).default("all"),
  }),

  execute: async ({ content, category }) => {
    // Extract revenue rows from content
    return {
      success: true,
      rows: [...],
      confidence: 0.85,
    };
  },
});
```

### 3. Agent Layer (`src/agent/`)

The revenue extraction agent orchestrates the parsing workflow.

```typescript
import { generateText } from "ai";
import { aiModel, AI_CONFIG } from "../ai/config";
import { extractRevenueStreamsTool, categorizeRevenueStreamsTool } from "../ai/tools";

export async function runRevenueExtractionAgent(
  parsedContent: string,
  fileName: string
): Promise<ParseResult> {
  const result = await generateText({
    model: aiModel,
    maxSteps: AI_CONFIG.maxSteps,
    tools: {
      extractRevenueStreams: extractRevenueStreamsTool,
      categorizeRevenueStreams: categorizeRevenueStreamsTool,
    },
    system: getExtractionSystemPrompt(),
    prompt: buildExtractionPrompt(parsedContent, fileName),
  });

  return extractResultFromResponse(result);
}
```

### 4. Export Layer (`src/export/`)

Excel workbook generation with formulas:

```typescript
import ExcelJS from "exceljs";

export async function generateExcelWorkbook(
  revenueStreams: RevenueStream[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Summary");
  addSummarySheet(summarySheet, revenueStreams);

  // Sheet 2-4: Category sheets
  for (const stream of revenueStreams) {
    const sheet = workbook.addWorksheet(stream.name);
    addRevenueStreamSheet(sheet, stream);
  }

  // Sheet 5: Calculations with Excel formulas
  const calcSheet = workbook.addWorksheet("Calculations");
  calcSheet.getCell("A1").value = "Total Gross Revenue";
  calcSheet.getCell("B1").value = { formula: "SUM(Summary!B:B)" };

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

## Type Definitions

### Core Types (`src/types/revenue-stream.ts`)

```typescript
/**
 * Revenue Stream Category
 */
export type RevenueStreamCategory = 'Residential' | 'Commercial' | 'Miscellaneous';

/**
 * Revenue Stream
 * A categorized collection of revenue rows
 */
export interface RevenueStream {
  /** Unique identifier */
  id: string;

  /** User-defined name: "Office Rents", "Parking", etc. */
  name: string;

  /** Category for grouping */
  category: RevenueStreamCategory;

  /** Optional description */
  notes?: string;

  /** Display order */
  order: number;

  /** Individual revenue items */
  rows: RevenueRow[];

  /** Section-level vacancy rate (0-100) */
  vacancyRate?: number;

  /** Calculated totals */
  totals?: {
    grossRevenue: number;
    effectiveRevenue: number;
    squareFootage: number;
  };
}

/**
 * Revenue Row
 * Individual unit/lease data within a stream
 */
export interface RevenueRow {
  /** Unique identifier */
  id: string;

  /** Unit identifier: "Apt 1A", "Suite 200" */
  unit: string;

  /** Square footage */
  squareFeet: number | null;

  /** Monthly rent rate */
  monthlyRate: number | null;

  /** Annual income (monthlyRate * 12) */
  annualIncome: number | null;

  /** Effective annual income after vacancy */
  effectiveAnnualIncome: number | null;

  /** Whether unit is vacant */
  isVacant: boolean;

  /** Combined vacancy/credit loss % (0-100) */
  operatingVacancyAndCreditLoss: number;

  /** Tenant name if occupied */
  tenantName?: string;

  /** Market rent for comparison */
  marketRent?: number | null;

  /** Variance from market rent */
  rentVariance?: number | null;

  /** Lease expiration date (ISO string) */
  leaseExpiry?: string;
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
  revenueStreams?: RevenueStream[];
  metadata?: {
    sourceFileName: string;
    processingTimeMs: number;
    confidence: number;
    agentReasoning: string;
  };
  rawText?: string;
  error?: string;
}

export interface ExportExcelRequest {
  revenueStreams: RevenueStream[];
  options?: {
    templateName?: "standard" | "detailed";
    includeMetadata?: boolean;
  };
}
```

## API Contracts

### POST `/api/parse`

Parse a rent roll document.

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
  "revenueStreams": [
    {
      "id": "stream-1",
      "name": "Apartment Rents",
      "category": "Residential",
      "order": 1,
      "rows": [
        {
          "id": "row-1",
          "unit": "Apt 1A",
          "squareFeet": 850,
          "monthlyRate": 1500,
          "annualIncome": 18000,
          "effectiveAnnualIncome": 17100,
          "isVacant": false,
          "operatingVacancyAndCreditLoss": 5,
          "tenantName": "John Smith"
        }
      ],
      "vacancyRate": 5,
      "totals": {
        "grossRevenue": 18000,
        "effectiveRevenue": 17100,
        "squareFootage": 850
      }
    }
  ],
  "metadata": {
    "sourceFileName": "rent-roll.pdf",
    "processingTimeMs": 2340,
    "confidence": 0.92,
    "agentReasoning": "Extracted 1 residential unit from rent roll..."
  }
}
```

### POST `/api/export`

Export revenue streams to Excel.

**Request:**
```json
{
  "revenueStreams": [ ... ],
  "options": {
    "templateName": "standard",
    "includeMetadata": true
  }
}
```

**Response:** Binary Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

## Integration Pattern

### other_branch Integration

```typescript
// other_branch: src/app/api/parse-document/route.ts
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

  // result.revenueStreams maps to SubModule.data.revenueStreams
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
  revenueStreams: RevenueStream[];
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
    const buffer = await readFixture("sample-rent-roll.pdf");
    const result = await parsePDF(buffer, "sample-rent-roll.pdf");

    expect(result.text).toContain("Unit");
    expect(result.text.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// src/agent/__tests__/revenue-extraction.test.ts
describe("Revenue Extraction Agent", () => {
  it("should extract and categorize revenue streams", async () => {
    const content = readFixture("parsed-rent-roll.txt");
    const result = await runRevenueExtractionAgent(content, "rent-roll.pdf");

    expect(result.revenueStreams).toBeDefined();
    expect(result.revenueStreams.length).toBeGreaterThan(0);
    expect(result.revenueStreams[0].rows.length).toBeGreaterThan(0);
  });
});
```

## Future Considerations

1. **Batch Processing**: Support for multiple documents in single request
2. **Template System**: Custom extraction templates for different rent roll formats
3. **Webhook Support**: Async processing with completion notifications
4. **Multi-Model**: Fallback to alternative models (GPT-4V, Gemini)
5. **Self-Hosted**: Option to run with local models for data sensitivity
