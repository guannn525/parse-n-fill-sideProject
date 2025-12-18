# PARSE-N-FILL

A modular rent roll parsing API powered by Claude AI. Parse financial documents and extract structured revenue streams for commercial real estate income-approach analysis.

## Overview

PARSE-N-FILL is a standalone API module designed to:

1. **Parse** rent rolls and financial documents (PDF, Excel, CSV, images)
2. **Extract** unit-level revenue data using Claude AI vision and reasoning
3. **Categorize** revenue into Residential, Commercial, and Miscellaneous streams
4. **Output** structured RevenueStream[] JSON compatible with income-approach workflows
5. **Export** to Excel with unit-level breakdown and totals

## RevenueStream Model

The core output structure for income-approach revenue analysis:

```typescript
interface RevenueStream {
  id: string;
  name: string;                     // "Office Rents", "Parking", etc.
  category: 'Residential' | 'Commercial' | 'Miscellaneous';
  notes?: string;
  order: number;
  rows: RevenueRow[];
  vacancyRate?: number;             // 0-100
  totals?: {
    grossRevenue: number;
    effectiveRevenue: number;
    squareFootage: number;
  };
}

interface RevenueRow {
  id: string;
  unit: string;                     // "Apt 1A", "Suite 200"
  squareFeet: number | null;
  monthlyRate: number | null;
  annualIncome: number | null;      // monthlyRate * 12
  effectiveAnnualIncome: number | null;
  isVacant: boolean;
  operatingVacancyAndCreditLoss: number;
  tenantName?: string;
  marketRent?: number | null;
  rentVariance?: number | null;
  leaseExpiry?: string;
}
```

### Example Output

```json
{
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
          "tenantName": "John Smith",
          "leaseExpiry": "2025-06-30"
        },
        {
          "id": "row-2",
          "unit": "Apt 1B",
          "squareFeet": 900,
          "monthlyRate": 1600,
          "annualIncome": 19200,
          "effectiveAnnualIncome": 18240,
          "isVacant": false,
          "operatingVacancyAndCreditLoss": 5,
          "tenantName": "Jane Doe"
        }
      ],
      "vacancyRate": 5,
      "totals": {
        "grossRevenue": 37200,
        "effectiveRevenue": 35340,
        "squareFootage": 1750
      }
    },
    {
      "id": "stream-2",
      "name": "Parking",
      "category": "Miscellaneous",
      "order": 2,
      "rows": [
        {
          "id": "row-3",
          "unit": "Lot A",
          "squareFeet": null,
          "monthlyRate": 100,
          "annualIncome": 1200,
          "effectiveAnnualIncome": 1200,
          "isVacant": false,
          "operatingVacancyAndCreditLoss": 0
        }
      ],
      "totals": {
        "grossRevenue": 1200,
        "effectiveRevenue": 1200,
        "squareFootage": 0
      }
    }
  ],
  "metadata": {
    "sourceFileName": "rent-roll.pdf",
    "processingTimeMs": 2340,
    "confidence": 0.92,
    "agentReasoning": "Extracted 2 units from residential rent roll. Identified parking as miscellaneous income based on non-unit naming."
  }
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

Add your Anthropic API key:

```
ANTHROPIC_API_KEY=your_api_key_here
```

### Usage

```typescript
import { parseDocument, exportToExcel } from 'parse-n-fill';

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

// Export to Excel
const excelBuffer = await exportToExcel(result.revenueStreams);
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| AI Model | Claude Sonnet 4.5 | Document parsing & reasoning |
| AI SDK | Vercel AI SDK + @ai-sdk/anthropic | API integration |
| File Parsing | ExcelJS, PapaParse | Excel/CSV processing |
| Validation | Zod | Schema validation |
| Testing | Vitest | Unit & integration tests |
| Language | TypeScript (strict) | Type safety |

## Supported File Types

| Type | Extension | Parsing Method |
|------|-----------|----------------|
| PDF | .pdf | Claude vision (base64) |
| Excel | .xlsx, .xls | ExcelJS + PapaParse |
| CSV | .csv | PapaParse |
| Images | .png, .jpg, .webp | Claude vision (OCR) |

## API Reference

### `parseDocument(options)`

Parse a rent roll or financial document and extract revenue streams.

```typescript
interface ParseOptions {
  fileName: string;      // Original filename
  fileType: string;      // MIME type
  fileData: string;      // Base64-encoded content
  options?: {
    includeRawText?: boolean;  // Include raw extracted text
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

### `exportToExcel(revenueStreams, options?)`

Generate an Excel workbook from revenue streams.

```typescript
interface ExportOptions {
  templateName?: "standard" | "detailed";
  includeMetadata?: boolean;
}

// Returns: Buffer (xlsx file)
```

## Compatibility

PARSE-N-FILL is designed to integrate with:

- **other_branch**: Via API routes (Clerk Auth) - populates income-approach revenue page

The output RevenueStream[] format is compatible with other_branch's `SubModule.data.revenueStreams` structure.

## Project Structure

```
parse-n-fill/
├── src/
│   ├── types/          # TypeScript interfaces (RevenueStream, RevenueRow)
│   ├── schemas/        # Zod validation schemas
│   ├── parsers/        # File parsing utilities (PDF, Excel, CSV, Image)
│   ├── ai/
│   │   ├── config.ts   # Claude model config
│   │   ├── prompts/    # System prompts for revenue extraction
│   │   └── tools/      # AI agent tools (extract, categorize)
│   ├── agent/          # Revenue extraction agent
│   ├── export/         # Excel export utilities
│   ├── api/            # API handlers
│   └── lib/            # Shared utilities
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

## Cost Estimation

Using Claude Sonnet 4.5 with Batch API:

| Volume | Cost/Month | Per Document |
|--------|------------|--------------|
| 100 docs | ~$0.38 | $0.0038 |
| 1,000 docs | ~$3.75 | $0.0038 |
| 10,000 docs | ~$37.50 | $0.0038 |

*Estimates based on 5-page rent roll documents with mixed text/images*

## License

MIT

## Related Projects

- [other_branch](../other_branch) - BOV Generator application with income-approach module
