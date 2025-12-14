# PARSE-N-FILL

A modular financial document parsing API powered by Claude AI. Parse financial documents and extract structured data into the Direct Capitalization Rate Model format.

## Overview

PARSE-N-FILL is a standalone API module designed to:

1. **Parse** financial documents (PDF, Excel, CSV, images)
2. **Extract** financial line items using Claude AI vision and reasoning
3. **Categorize** items into revenue, expenses, and adjustments
4. **Output** structured JSON following the Direct Capitalization Rate Model
5. **Export** to Excel with calculations and formulas

## Direct Capitalization Rate Model

The core output structure for commercial real estate valuation:

```typescript
interface DirectCapitalizationRateModel {
  timeStamp: string;                              // ISO timestamp of extraction
  agentReasoning: string;                         // AI explanation for audit trail
  annualOperatingRevenue: Record<string, number>; // Revenue line items
  annualOperatingExpenses: Record<string, number>;// Expense line items
  oneTimeAdjustment: Record<string, number>;      // One-time adjustments
}
```

### Example Output

```json
{
  "timeStamp": "2025-12-12T10:30:00.000Z",
  "agentReasoning": "Extracted 5 revenue items from rent roll. Identified property taxes and insurance as operating expenses. Deferred maintenance flagged as one-time adjustment based on non-recurring nature.",
  "annualOperatingRevenue": {
    "Rental Income": 120000,
    "Parking Fees": 5000,
    "Laundry Income": 2400
  },
  "annualOperatingExpenses": {
    "Property Tax": 15000,
    "Insurance": 8000,
    "Utilities": 12000,
    "Management Fee": 6000
  },
  "oneTimeAdjustment": {
    "Deferred Maintenance": -5000,
    "Capital Reserve": -3000
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

// Parse a financial document
const result = await parseDocument({
  fileName: "rent-roll.pdf",
  fileType: "application/pdf",
  fileData: base64EncodedFile,
});

console.log(result.model);
// DirectCapitalizationRateModel with extracted data

console.log(result.calculations);
// { grossPotentialIncome, totalExpenses, netOperatingIncome, ... }

// Export to Excel
const excelBuffer = await exportToExcel(result.model);
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

Parse a financial document and extract structured data.

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
  model: DirectCapitalizationRateModel;
  calculations: DirectCapCalculations;
  metadata: {
    sourceFileName: string;
    processingTimeMs: number;
    confidence: number;
  };
}
```

### `exportToExcel(model, options?)`

Generate an Excel workbook from the model.

```typescript
interface ExportOptions {
  templateName?: "standard" | "detailed";
  includeCharts?: boolean;
}

// Returns: Buffer (xlsx file)
```

## Compatibility

PARSE-N-FILL is designed to integrate with:

- **MAP05**: Via Server Actions or API routes (Supabase Auth)
- **other_branch**: Via API routes (Clerk Auth)

Both applications can consume this as a standalone module.

## Project Structure

```
parse-n-fill/
├── src/
│   ├── types/          # TypeScript interfaces
│   ├── schemas/        # Zod validation schemas
│   ├── parsers/        # File parsing utilities
│   ├── ai/
│   │   ├── config.ts   # Claude model config
│   │   ├── prompts/    # System prompts
│   │   └── tools/      # AI agent tools
│   ├── agent/          # Financial extraction agent
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

*Estimates based on 5-page documents with mixed text/images*

## License

MIT

## Related Projects

- [MAP05](../MAP05) - Geo-intelligence mapping platform
- [other_branch](../other_branch) - BOV Generator application
