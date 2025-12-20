# PARSE-N-FILL Progress Checklist

**Purpose**: Track implementation of a modular financial document parsing feature that extracts revenue streams and outputs JSON.

**Current State**: Phase 4 complete. Ready for Phase 5 (API Layer).

**Last Updated**: 2025-12-20

---

## Phase 1: Foundation (Core Module) ✅

### 1.1 AI Configuration

- [x] Create `src/ai/config.ts` - Gemini model configuration (Gemini 3 Flash default, Gemini 3 Pro for complex)
- [x] Define model selection logic based on document complexity
- [x] Configure API client with proper error handling

### 1.2 System Prompts

- [x] Create `src/ai/prompts/extraction-prompt.ts` - Financial data extraction prompt
- [x] Create `src/ai/prompts/categorization-prompt.ts` - Line item categorization prompt
- [x] Include domain knowledge for commercial real estate (revenue categories)

### 1.3 Utility Layer

- [x] Create `src/lib/errors.ts` - Custom error classes (ParseError, ValidationError, AIError)
- [x] Create `src/lib/constants.ts` - File types, size limits, supported formats
- [x] Create `src/lib/utils.ts` - Shared utility functions

### 1.4 Review & Fixes

- [x] Code review using `review-implementation.md` checklist
- [x] Export utilities from main `src/index.ts`
- [x] Fix `formatCurrency` to handle NaN/Infinity
- [x] TypeScript compilation verified

---

## Phase 2: Parser Layer ✅

### 2.1 Parser Factory

- [x] Create `src/parsers/index.ts` - Parser factory with file type detection
- [x] Implement `getParser(fileType)` function
- [x] Support MIME type and extension-based detection

### 2.2 Individual Parsers

- [x] Create `src/parsers/pdf-parser.ts` - Gemini vision for PDF text/table extraction
- [x] Create `src/parsers/excel-parser.ts` - ExcelJS for .xlsx/.xls files
- [x] Create `src/parsers/csv-parser.ts` - PapaParse for CSV files
- [x] Create `src/parsers/image-parser.ts` - Gemini vision for image OCR
- [x] Implement consistent output format across all parsers

### 2.3 Parser Tests

- [x] Create `src/parsers/pdf-parser.test.ts`
- [x] Create `src/parsers/excel-parser.test.ts`
- [x] Create `src/parsers/csv-parser.test.ts`
- [x] Create `src/parsers/image-parser.test.ts`
- [x] Add test fixtures for each file type (inline fixtures in tests)

---

## Phase 3: AI Tools Layer ✅

### 3.1 Revenue Stream Extraction Tool

- [x] Create `src/ai/tools/extract-revenue-streams.ts`
- [x] Define Zod input schema (parsed content, document type hints)
- [x] Implement extraction logic using Gemini
- [x] Return structured RevenueStream[] with unit-level data
- [x] Include confidence scores and source tracking

### 3.2 Revenue Categorization

- [x] Inline categorization in extract-revenue-streams.ts (separate tool not needed)
- [x] Define categories: Residential, Commercial, Miscellaneous
- [x] Group extracted rows into RevenueStream objects by category
- [x] Implement reasoning capture for audit trail

### 3.3 Tool Tests

- [x] Create `src/ai/tools/extract-revenue-streams.test.ts` (17 tests)
- [x] Mock Gemini API for deterministic testing

### 3.4 Types & Schemas

- [x] Create `src/types/revenue-stream.ts` - RevenueStream, RevenueRow interfaces
- [x] Create `src/ai/tools/revenue-stream-types.ts` - Zod validation schemas

---

## Phase 4: Agent Layer ✅

### 4.1 Revenue Extraction Agent

- [x] Create `src/agent/revenue-extraction-agent.ts`
- [x] Implement orchestration: parse -> extract rows -> categorize streams -> validate
- [x] Handle multi-page rent rolls (via parser layer)
- [x] Support incremental extraction for large files (complexity-based model selection)

### 4.2 Agent Configuration

- [x] Define agent decision tree (when to use which tools)
- [x] Implement retry logic with exponential backoff (via AI SDK)
- [x] Add progress reporting callbacks (metadata with durations)

### 4.3 Agent Tests

- [x] Create `src/agent/revenue-extraction-agent.test.ts` (21 tests)
- [x] Test full extraction pipeline
- [x] Test error recovery scenarios

---

## Phase 5: API Layer

### 5.1 Parse Document API

- [ ] Implement `src/api/parse-document.ts` (currently stub)
- [ ] Accept: file buffer/path, options
- [ ] Return: `{ revenueStreams: RevenueStream[] }` + metadata
- [ ] Add request validation with Zod schemas

### 5.2 API Tests

- [ ] Create `src/api/parse-document.test.ts`
- [ ] Test end-to-end parse → JSON workflow

---

## Phase 6: Quality & Documentation

### 6.1 Test Coverage

- [ ] Achieve >80% test coverage
- [ ] Add integration tests with real rent roll documents
- [ ] Performance benchmarks

### 6.2 Documentation

- [ ] Update README.md with usage examples
- [ ] Add API reference documentation

### 6.3 Error Handling

- [ ] Comprehensive error messages
- [ ] Logging with context
- [ ] User-friendly error responses

---

## Key Files Reference

| File                                   | Status      | Purpose                                                  |
| -------------------------------------- | ----------- | -------------------------------------------------------- |
| `src/types/revenue-stream.ts`          | ✅ Complete | RevenueStream, RevenueRow interfaces                     |
| `src/ai/tools/revenue-stream-types.ts` | ✅ Complete | Zod validation schemas                                   |
| `src/api/parse-document.ts`            | Stub        | Main parse API                                           |
| `src/parsers/*`                        | ✅ Complete | File parsers (PDF, Excel, CSV, Image)                    |
| `src/ai/config.ts`                     | ✅ Complete | Gemini config                                            |
| `src/ai/prompts/*`                     | ✅ Complete | System prompts (revenue extraction)                      |
| `src/ai/tools/*`                       | ✅ Complete | AI tools (revenue extraction with inline categorization) |
| `src/agent/*`                          | ✅ Complete | Revenue extraction agent (21 tests)                      |
| `src/lib/*`                            | ✅ Complete | Utilities (errors, constants, utils)                     |

---

## Environment Variables

```bash
# Required for PARSE-N-FILL
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# Optional
GEMINI_MODEL=gemini-3-flash-preview  # Override default model
LOG_LEVEL=debug
```

---

## Target Output: RevenueStream

```typescript
interface RevenueStream {
  id: string;
  name: string; // "Office Rents", "Parking", etc.
  category: "Residential" | "Commercial" | "Miscellaneous";
  notes?: string;
  order: number;
  rows: RevenueRow[];
  vacancyRate?: number; // 0-100
  totals?: {
    grossRevenue: number;
    effectiveRevenue: number;
    squareFootage: number;
  };
}

interface RevenueRow {
  id: string;
  unit: string; // "Apt 1A", "Suite 200"
  squareFeet: number | null;
  monthlyRate: number | null;
  annualIncome: number | null; // monthlyRate * 12
  effectiveAnnualIncome: number | null;
  isVacant: boolean;
  operatingVacancyAndCreditLoss: number;
  tenantName?: string;
  marketRent?: number | null;
  rentVariance?: number | null;
  leaseExpiry?: string;
}
```

---

## Success Criteria

- [ ] Parse PDF rent rolls and extract unit-level revenue data
- [ ] Parse Excel rent rolls and extract RevenueRow[] data
- [ ] Output valid RevenueStream[] JSON
- [ ] > 80% test coverage
- [ ] Documentation complete

---

## Notes

- PARSE-N-FILL uses Gemini for rent roll parsing and revenue extraction
- Output is RevenueStream[] with unit-level RevenueRow[] data
- Vercel AI SDK used for AI integration
- Zod validation for all schemas

---

## Review Log

| Date       | Phase   | Status    | Notes                                                                                                                                                                                                                               |
| ---------- | ------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2024-12-13 | Phase 1 | ✅ Passed | AI config, prompts, utilities reviewed. Fixed exports and formatCurrency edge case.                                                                                                                                                 |
| 2024-12-14 | Phase 2 | ✅ Passed | Parser layer complete. 4 parsers (PDF, Excel, CSV, Image) with 45 passing tests. Used Claude vision for PDFs/images, ExcelJS/PapaParse for structured files. Fixed AI SDK v5 `maxOutputTokens` param and safe ArrayBuffer handling. |
| 2025-12-17 | Docs    | Revised   | Pivoted from DirectCapitalizationRateModel to RevenueStream output. Removed MAP05 references. Focus now on other_branch income-approach integration.                                                                                |
| 2025-12-19 | Phase 3 | ✅ Passed | AI tools layer complete. extractRevenueStreams tool with inline categorization, Zod schemas in revenue-stream-types.ts, TypeScript interfaces, and 17 tests all passing.                                                            |
| 2025-12-19 | Phase 4 | ✅ Passed | Agent layer complete. revenue-extraction-agent.ts orchestrates parse→extract→JSON pipeline. 21 tests passing. CLI script (scripts/extract.ts) for manual testing. Migrated to Gemini 3 Flash Preview/Pro 3 Preview.                 |
| 2025-12-20 | Scope   | Revised   | Simplified scope: parse → JSON output only. Removed Excel export (Phase 5) and other_branch integration (Phase 7). Focus on testing and finalizing core parse workflow.                                                             |
