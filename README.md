# PARSE-N-FILL

A modular rent roll parsing API powered by Gemini AI. Parse financial documents and extract structured revenue streams for commercial real estate income-approach analysis.

## Overview

PARSE-N-FILL is a standalone API module designed to:

1. **Parse** rent rolls and financial documents (PDF, Excel, CSV, images)
2. **Extract** unit-level revenue data using Gemini AI vision and reasoning
3. **Categorize** revenue into Residential, Commercial, and Miscellaneous streams
4. **Output** structured RevenueStream[] JSON compatible with income-approach workflows

## RevenueStream Model

The core output structure for income-approach revenue analysis:

```typescript
interface RevenueStream {
  id: string;
  name: string; // "Office Rents", "Parking", etc.
  category: "Residential" | "Commercial" | "Miscellaneous";
  order: number;
  rows: RevenueRow[];
}

interface RevenueRow {
  id: string;
  unit: string; // "Apt 1A", "Suite 200"
  squareFeet: number | null;
  monthlyRate: number | null;
  annualIncome: number | null;
  isVacant: boolean;
}
```

**Note:** Additional fields (vacancyRate, totals, tenantName, etc.) can be calculated by the consuming UI based on these base fields.

### Example Output

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
          "id": "stream-1-row-1",
          "unit": "Apt 1A",
          "squareFeet": 850,
          "monthlyRate": 1500,
          "annualIncome": 18000,
          "isVacant": false
        },
        {
          "id": "stream-1-row-2",
          "unit": "Apt 1B",
          "squareFeet": 900,
          "monthlyRate": 1600,
          "annualIncome": 19200,
          "isVacant": false
        }
      ]
    },
    {
      "id": "stream-2",
      "name": "Parking",
      "category": "Miscellaneous",
      "order": 2,
      "rows": [
        {
          "id": "stream-2-row-1",
          "unit": "Lot A",
          "squareFeet": null,
          "monthlyRate": 100,
          "annualIncome": 1200,
          "isVacant": false
        }
      ]
    }
  ],
  "overallConfidence": 0.92,
  "reasoning": "Extracted 3 units from rent roll. Identified 2 residential apartments and 1 parking space as miscellaneous income."
}
```

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file:

```bash
cp .env.example .env
```

Add your Google API key:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### Usage

```typescript
import { parseDocument } from "parse-n-fill";

// Parse a rent roll document
const result = await parseDocument({
  fileName: "rent-roll.pdf",
  fileType: "application/pdf",
  fileData: base64EncodedFile,
});

console.log(result.revenueStreams);
// RevenueStream[] with unit-level data

console.log(result.metadata);
// { sourceFileName, processingTimeMs, confidence, agentReasoning }
```

## Tech Stack

| Component    | Technology                     | Purpose                      |
| ------------ | ------------------------------ | ---------------------------- |
| AI Model     | Gemini 3 Flash (Preview)       | Document parsing & reasoning |
| AI SDK       | Vercel AI SDK + @ai-sdk/google | API integration              |
| File Parsing | ExcelJS, PapaParse             | Excel/CSV processing         |
| Validation   | Zod                            | Schema validation            |
| Testing      | Vitest                         | Unit & integration tests     |
| Language     | TypeScript (strict)            | Type safety                  |

## Supported File Types

| Type   | Extension         | Parsing Method         |
| ------ | ----------------- | ---------------------- |
| PDF    | .pdf              | Gemini vision (base64) |
| Excel  | .xlsx, .xls       | ExcelJS + PapaParse    |
| CSV    | .csv              | PapaParse              |
| Images | .png, .jpg, .webp | Gemini vision (base64) |

## API Reference

### `parseDocument(options)`

Parse a rent roll or financial document and extract revenue streams.

```typescript
interface ParseOptions {
  fileName: string; // Original filename
  fileType: string; // MIME type
  fileData: string; // Base64-encoded content
  options?: {
    includeRawText?: boolean; // Include raw extracted text
  };
}

interface ParseResult {
  success: boolean;
  revenueStreams: RevenueStream[];
  metadata: {
    sourceFileName: string;
    processingTimeMs: number;
    confidence: number;
    agentReasoning: string;
  };
}
```

### `exportToExcel(revenueStreams, options?)` (Not Implemented)

Excel export functionality is planned but not yet implemented.

## Compatibility

PARSE-N-FILL is designed to integrate with:

- **other_branch**: Via API routes (Clerk Auth) - populates income-approach revenue page

The output RevenueStream[] format is compatible with other_branch's `SubModule.data.revenueStreams` structure.

## Project Structure

```
parse-n-fill/
├── src/
│   ├── types/          # TypeScript interfaces (RevenueStream, RevenueRow)
│   ├── parsers/        # File parsing utilities (PDF, Excel, CSV, Image)
│   ├── ai/
│   │   ├── config.ts   # Gemini model config
│   │   ├── prompts/    # System prompts for revenue extraction
│   │   └── tools/      # AI agent tools + Zod schemas
│   ├── agent/          # Revenue extraction agent
│   └── lib/            # Shared utilities (errors, constants)
├── scripts/            # CLI utilities
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## CLI Testing

Test extraction from the command line:

```bash
npx tsx scripts/extract.ts <file-path> [property-type]
```

Example:

```bash
npx tsx scripts/extract.ts ./rent-roll.pdf residential
```

Output is saved to `output/<filename>.json`

## Cost Estimation

Using Gemini 3 Flash (Preview):

| Volume      | Cost/Month | Per Document |
| ----------- | ---------- | ------------ |
| 100 docs    | ~$0.15     | $0.0015      |
| 1,000 docs  | ~$1.50     | $0.0015      |
| 10,000 docs | ~$15.00    | $0.0015      |

_Estimates based on 5-page rent roll documents with mixed text/images. Gemini 3 Flash offers significantly lower costs compared to Claude. Actual costs may vary based on Gemini 3 pricing._

## License

MIT

## Related Projects

- [other_branch](../other_branch) - BOV Generator application with income-approach module
