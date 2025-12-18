# PARSE-N-FILL Progress Checklist

**Purpose**: Track implementation of a modular financial document parsing feature that extracts revenue streams compatible with other_branch's income-approach module.

**Current State**: Phase 2 complete. Phase 3 needs revision for RevenueStream output.

**Last Updated**: 2025-12-17

---

## Phase 1: Foundation (Core Module) ✅

### 1.1 AI Configuration
- [x] Create `src/ai/config.ts` - Claude model configuration (Sonnet 4.5 default, Opus 4.5 for complex)
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
- [x] Create `src/parsers/pdf-parser.ts` - Claude vision for PDF text/table extraction
- [x] Create `src/parsers/excel-parser.ts` - ExcelJS for .xlsx/.xls files
- [x] Create `src/parsers/csv-parser.ts` - PapaParse for CSV files
- [x] Create `src/parsers/image-parser.ts` - Claude vision for image OCR
- [x] Implement consistent output format across all parsers

### 2.3 Parser Tests
- [x] Create `src/parsers/pdf-parser.test.ts`
- [x] Create `src/parsers/excel-parser.test.ts`
- [x] Create `src/parsers/csv-parser.test.ts`
- [x] Create `src/parsers/image-parser.test.ts`
- [x] Add test fixtures for each file type (inline fixtures in tests)

---

## Phase 3: AI Tools Layer (Revision Needed)

### 3.1 Revenue Stream Extraction Tool
- [ ] Create `src/ai/tools/extract-revenue-streams.ts`
- [ ] Define Zod input schema (parsed content, document type hints)
- [ ] Implement extraction logic using Claude
- [ ] Return structured RevenueRow[] with unit-level data (unit, sqft, monthlyRate, vacancy)
- [ ] Include confidence scores and source tracking

### 3.2 Revenue Categorization Tool
- [ ] Create `src/ai/tools/categorize-revenue-streams.ts`
- [ ] Define categories: Residential, Commercial, Miscellaneous
- [ ] Group extracted rows into RevenueStream objects by category
- [ ] Implement reasoning capture for audit trail

### 3.3 Tool Tests
- [ ] Create `src/ai/tools/extract-revenue-streams.test.ts`
- [ ] Create `src/ai/tools/categorize-revenue-streams.test.ts`
- [ ] Mock Claude API for deterministic testing

### 3.4 Types & Schemas
- [ ] Create `src/types/revenue-stream.ts` - RevenueStream, RevenueRow interfaces
- [ ] Create `src/schemas/revenue-stream-schema.ts` - Zod validation schemas

---

## Phase 4: Agent Layer

### 4.1 Revenue Extraction Agent
- [ ] Create `src/agent/revenue-extraction-agent.ts`
- [ ] Implement orchestration: parse -> extract rows -> categorize streams -> validate
- [ ] Handle multi-page rent rolls
- [ ] Support incremental extraction for large files

### 4.2 Agent Configuration
- [ ] Define agent decision tree (when to use which tools)
- [ ] Implement retry logic with exponential backoff
- [ ] Add progress reporting callbacks

### 4.3 Agent Tests
- [ ] Create `src/agent/revenue-extraction-agent.test.ts`
- [ ] Test full extraction pipeline
- [ ] Test error recovery scenarios

---

## Phase 5: Export Layer

### 5.1 Excel Export
- [ ] Create `src/export/excel-export.ts`
- [ ] Define workbook structure matching income-approach revenue format
- [ ] Include unit-level breakdown (not just totals)
- [ ] Add formatting (headers, totals, conditional formatting)
- [ ] Add metadata sheet (timestamp, source file, agent reasoning)

### 5.2 Export Tests
- [ ] Create `src/export/excel-export.test.ts`
- [ ] Verify workbook structure matches income-approach format
- [ ] Test with various data volumes

---

## Phase 6: API Layer

### 6.1 Parse Document API
- [ ] Implement `src/api/parse-document.ts` (currently stub)
- [ ] Accept: file buffer/URL, options
- [ ] Return: `{ revenueStreams: RevenueStream[] }` + metadata
- [ ] Add request validation with Zod schemas

### 6.2 Export Excel API
- [ ] Implement `src/api/export-excel.ts` (currently stub)
- [ ] Accept: RevenueStream[]
- [ ] Return: Excel buffer or file path
- [ ] Support streaming for large files

### 6.3 API Tests
- [ ] Create `src/api/parse-document.test.ts`
- [ ] Create `src/api/export-excel.test.ts`
- [ ] Test end-to-end workflows

---

## Phase 7: Integration - other_branch

> **NOTE: FOR DOCUMENTATION ONLY**
>
> other_branch is a separate production application. The tasks below document HOW to integrate PARSE-N-FILL into other_branch, but the actual integration work will be done in the other_branch repository, NOT here. Do NOT edit files in `/mnt/c/PARSE-N-FILL/other_branch/`.

### 7.1 API Route (in other_branch repo)
- [ ] Create `src/app/api/parse-document/route.ts` in other_branch
- [ ] Use Clerk auth (`auth()` from `@clerk/nextjs/server`)
- [ ] Accept file upload or session file reference

### 7.2 Type Mapping (in other_branch repo)
- [ ] Map PARSE-N-FILL RevenueStream[] -> other_branch RevenueStream[]
- [ ] Ensure id, name, category, rows[], vacancyRate, totals compatibility
- [ ] Handle RevenueRow field mapping (unit, squareFeet, monthlyRate, etc.)

### 7.3 Session Integration (in other_branch repo)
- [ ] Update session with parsed data via `/api/sessions/drafts/[id]`
- [ ] Pre-populate income-approach revenue page from parsed results
- [ ] Update Zustand store (SubModule.data.revenueStreams)

### 7.4 Integration Tests (in other_branch repo)
- [ ] Test with other_branch session workflow
- [ ] Verify revenue calculations work with parsed data

---

## Phase 8: Quality & Documentation

### 8.1 Test Coverage
- [ ] Achieve >80% test coverage
- [ ] Add integration tests with real rent roll documents
- [ ] Performance benchmarks

### 8.2 Documentation
- [ ] Update README.md with usage examples
- [ ] Document integration pattern for other_branch
- [ ] Add API reference documentation

### 8.3 Error Handling
- [ ] Comprehensive error messages
- [ ] Logging with context
- [ ] User-friendly error responses

---

## Key Files Reference

### PARSE-N-FILL (Core Module)
| File | Status | Purpose |
|------|--------|---------|
| `src/types/revenue-stream.ts` | TODO | RevenueStream, RevenueRow interfaces |
| `src/schemas/revenue-stream-schema.ts` | TODO | Zod validation |
| `src/api/parse-document.ts` | Stub | Main parse API |
| `src/api/export-excel.ts` | Stub | Excel export API |
| `src/parsers/*` | ✅ Complete | File parsers (PDF, Excel, CSV, Image) |
| `src/ai/config.ts` | ✅ Complete | Claude config |
| `src/ai/prompts/*` | Needs Update | System prompts (update for revenue focus) |
| `src/ai/tools/*` | Needs Revision | AI tools (revenue extraction, categorization) |
| `src/agent/*` | Empty | Revenue extraction agent |
| `src/export/*` | Empty | Excel generation |
| `src/lib/*` | ✅ Complete | Utilities (errors, constants, utils) |

### other_branch Reference Files (READ-ONLY - Do NOT edit)
| File | Purpose |
|------|---------|
| `src/stores/types.ts` | Reference: RevenueStream, RevenueRow types |
| `src/app/(app)/bov/_components/underwriting-tab/income-approach/` | Reference: Income-approach UI structure |
| `src/app/api/sessions/drafts/[id]/route.ts` | Reference: Session update pattern |

---

## Environment Variables

```bash
# Required for PARSE-N-FILL
ANTHROPIC_API_KEY=your_key_here

# Optional
CLAUDE_MODEL=claude-sonnet-4-20250514
LOG_LEVEL=debug
```

---

## Target Output: RevenueStream

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

---

## Success Criteria

- [ ] Parse PDF rent rolls and extract unit-level revenue data
- [ ] Parse Excel rent rolls and extract RevenueRow[] data
- [ ] Output valid RevenueStream[] JSON compatible with other_branch
- [ ] Generate formatted Excel export matching income-approach format
- [ ] Integrate with other_branch income-approach revenue page
- [ ] >80% test coverage
- [ ] Documentation complete

---

## Notes

> **IMPORTANT: other_branch is a READ-ONLY reference project.**
> Do NOT edit files in that directory. Study its patterns, but implement all code in PARSE-N-FILL only.

- PARSE-N-FILL uses Claude for rent roll parsing and revenue extraction
- other_branch income-approach expects RevenueStream[] with unit-level RevenueRow[] data
- Vercel AI SDK is used across both codebases - consistent patterns available
- Zod validation is standard across both codebases
- Phase 7 documents HOW to integrate, not tasks to do here

---

## Review Log

| Date | Phase | Status | Notes |
|------|-------|--------|-------|
| 2024-12-13 | Phase 1 | ✅ Passed | AI config, prompts, utilities reviewed. Fixed exports and formatCurrency edge case. |
| 2024-12-14 | Phase 2 | ✅ Passed | Parser layer complete. 4 parsers (PDF, Excel, CSV, Image) with 45 passing tests. Used Claude vision for PDFs/images, ExcelJS/PapaParse for structured files. Fixed AI SDK v5 `maxOutputTokens` param and safe ArrayBuffer handling. |
| 2025-12-17 | Docs | Revised | Pivoted from DirectCapitalizationRateModel to RevenueStream output. Removed MAP05 references. Focus now on other_branch income-approach integration. |
