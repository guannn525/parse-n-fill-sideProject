# ARCHITECTURE.md

Technical architecture documentation for PARSE-N-FILL.

## System Overview

PARSE-N-FILL is a modular rent roll parsing system that uses Gemini AI to extract structured revenue stream data from various document formats and output RevenueStream[] compatible with income-approach analysis.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PARSE-N-FILL System                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   Input     │    │   Parser    │    │      AI Agent           │ │
│  │  Documents  │───▶│   Layer     │───▶│  (Gemini 3 Flash)       │ │
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
│   │   └── revenue-stream.ts       # Core model interfaces
│   │
│   ├── parsers/                    # File parsing layer
│   │   ├── index.ts                # Parser factory
│   │   ├── types.ts                # Parser type definitions
│   │   ├── pdf-parser.ts           # PDF via Gemini vision
│   │   ├── excel-parser.ts         # Excel via ExcelJS
│   │   ├── csv-parser.ts           # CSV via PapaParse
│   │   └── image-parser.ts         # Images via Gemini vision
│   │
│   ├── ai/                         # AI integration layer
│   │   ├── config.ts               # Model configuration
│   │   ├── prompts/                # System prompts
│   │   │   ├── index.ts
│   │   │   └── revenue-stream-prompt.ts
│   │   └── tools/                  # AI agent tools
│   │       ├── index.ts
│   │       ├── extract-revenue-streams.ts  # Extraction + categorization
│   │       └── revenue-stream-types.ts     # Zod schemas
│   │
│   ├── agent/                      # Agent orchestration
│   │   ├── index.ts
│   │   └── revenue-extraction-agent.ts
│   │
│   └── lib/                        # Shared utilities
│       ├── index.ts                # Re-exports
│       ├── errors.ts               # Custom error classes
│       ├── constants.ts            # Shared constants
│       └── utils.ts                # Utility functions
│
├── scripts/                        # CLI utilities
│   └── extract.ts                  # CLI extraction script
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
  text: string; // Extracted text content
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
): Promise<ParsedContent>;
```

**Parser Selection Logic:**

| MIME Type                          | Parser       | Method                 |
| ---------------------------------- | ------------ | ---------------------- |
| `application/pdf`                  | pdf-parser   | Gemini vision (base64) |
| `image/*`                          | image-parser | Gemini vision (base64) |
| `text/csv`                         | csv-parser   | PapaParse              |
| `application/vnd.openxmlformats-*` | excel-parser | ExcelJS → PapaParse    |

### 2. AI Layer (`src/ai/`)

#### Configuration (`src/ai/config.ts`)

```typescript
import { google } from "@ai-sdk/google";

const MODEL_IDS = {
  FLASH: "gemini-3-flash-preview",
  PRO: "gemini-3-pro-preview",
} as const;

export const AI_CONFIG = {
  maxSteps: 5,
  temperature: 0.3,
  defaultModel: MODEL_IDS.FLASH,
  complexModel: MODEL_IDS.PRO,
} as const;

export const aiModel = google(AI_CONFIG.defaultModel);

export function getModel(complexity: "standard" | "complex") {
  const modelId = complexity === "complex" ? AI_CONFIG.complexModel : AI_CONFIG.defaultModel;
  return google(modelId);
}
```

#### Tools (`src/ai/tools/`)

The extraction tool uses `generateObject` with Zod schemas for structured output:

```typescript
import { tool, generateObject } from "ai";
import { getModel, AI_CONFIG } from "../config";
import {
  extractRevenueStreamsInputSchema,
  extractRevenueStreamsOutputSchema,
} from "./revenue-stream-types";

export const extractRevenueStreams = tool({
  description: `Extract revenue data from rent roll documents into RevenueStream[] format.
  Returns categorized streams (Residential/Commercial/Miscellaneous) with unit-level data.`,

  inputSchema: extractRevenueStreamsInputSchema,

  execute: async (input) => {
    const { object } = await generateObject({
      model: getModel(input.rawText.length > 10000 ? "complex" : "standard"),
      schema: extractRevenueStreamsOutputSchema,
      system: getRevenueStreamSystemPrompt(),
      prompt: buildRevenueStreamPrompt(input.rawText, input.fileName),
      temperature: AI_CONFIG.temperature,
    });
    return object;
  },
});
```

### 3. Agent Layer (`src/agent/`)

The revenue extraction agent orchestrates the parsing workflow using a single extraction tool.

```typescript
import { executeRevenueStreamExtraction } from "../ai/tools";
import { parseFile } from "../parsers";
import type { RevenueStream, RevenueStreamExtractionResult } from "../types";

export interface ExtractionResult {
  success: boolean;
  revenueStreams: RevenueStream[];
  metadata: {
    sourceFileName: string;
    processingTimeMs: number;
    confidence: number;
    reasoning: string;
  };
  error?: string;
}

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
    error: result.error,
  };
}
```

## Type Definitions

### Core Types (`src/types/revenue-stream.ts`)

```typescript
/**
 * Revenue Stream Category
 */
export type RevenueStreamCategory = "Residential" | "Commercial" | "Miscellaneous";

/**
 * Revenue Row
 * Individual unit/lease data within a stream
 */
export interface RevenueRow {
  /** Unique row identifier */
  id: string;

  /** Unit identifier (Apt 1A, Suite 200) */
  unit: string;

  /** Unit square footage */
  squareFeet: number | null;

  /** Monthly rent amount (extracted if in document) */
  monthlyRate: number | null;

  /** Annual income (extracted if in document) */
  annualIncome: number | null;

  /** Whether unit is vacant */
  isVacant: boolean;
}

/**
 * Revenue Stream
 * A categorized collection of revenue rows
 */
export interface RevenueStream {
  /** Unique stream identifier */
  id: string;

  /** Stream name (Office Rents, Parking, etc.) */
  name: string;

  /** Category: Residential, Commercial, or Miscellaneous */
  category: RevenueStreamCategory;

  /** Display order (1-based) */
  order: number;

  /** Individual unit/revenue rows */
  rows: RevenueRow[];
}

/**
 * Extraction result for revenue streams
 */
export interface RevenueStreamExtractionResult {
  success: boolean;
  revenueStreams: RevenueStream[];
  overallConfidence: number;
  reasoning: string;
  warnings?: string[];
  error?: string;
}
```

### API Types (Planned)

```typescript
export interface ParseDocumentRequest {
  fileName: string;
  fileType: string;
  fileData: string; // base64
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

**Note:** The API contracts below represent the planned interface. Current implementation provides library functions, not HTTP endpoints.

### POST `/api/parse` (Planned)

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

### POST `/api/export` (Not Implemented)

Excel export functionality is planned but not yet implemented.

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
/**
 * Error thrown during document parsing operations
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Error thrown when validation fails (e.g., Zod schema validation)
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Error thrown when AI/LLM operations fail
 */
export class AIError extends Error {
  constructor(
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AIError";
  }
}

/**
 * Error thrown when financial data extraction fails
 */
export class ExtractionError extends Error {
  constructor(
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

/**
 * Error thrown when Excel export operations fail
 */
export class ExportError extends Error {
  constructor(
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ExportError";
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "revenueStreams": [],
  "overallConfidence": 0,
  "reasoning": "",
  "error": "Revenue stream extraction failed: Document appears to be encrypted"
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

- Gemini API: Implement request queuing for high volume
- Consider complexity-based model selection (Flash for simple, Pro for complex)

## Security Considerations

1. **Input Validation**: All inputs validated via Zod schemas
2. **File Size Limits**: 32MB max for documents
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
4. **Multi-Model**: Fallback to alternative models (GPT-4V, Claude)
5. **Self-Hosted**: Option to run with local models for data sensitivity
