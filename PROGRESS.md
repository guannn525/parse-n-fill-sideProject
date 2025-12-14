# PARSE-N-FILL Progress Checklist

**Purpose**: Track implementation of a modular financial document parsing feature compatible with both MAP05 and other_branch.

**Current State**: Phase 3 complete. Ready for Phase 4 (Agent Layer).

**Last Updated**: 2025-12-14

---

## Phase 1: Foundation (Core Module) ✅

### 1.1 AI Configuration
- [x] Create `src/ai/config.ts` - Claude model configuration (Sonnet 4.5 default, Opus 4.5 for complex)
- [x] Define model selection logic based on document complexity
- [x] Configure API client with proper error handling

### 1.2 System Prompts
- [x] Create `src/ai/prompts/extraction-prompt.ts` - Financial data extraction prompt
- [x] Create `src/ai/prompts/categorization-prompt.ts` - Line item categorization prompt
- [x] Include domain knowledge for commercial real estate (revenue/expense categories)

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

## Phase 3: AI Tools Layer ✅

### 3.1 Extraction Tool
- [x] Create `src/ai/tools/extract-financial-data.ts`
- [x] Define Zod input schema (parsed content, document type hints)
- [x] Implement extraction logic using Claude
- [x] Return structured line items with confidence scores

### 3.2 Categorization Tool
- [x] Create `src/ai/tools/categorize-line-items.ts`
- [x] Define categories: revenue, expenses, one-time adjustments
- [x] Implement reasoning capture for audit trail
- [x] Support custom category mappings

### 3.3 Tool Tests
- [x] Create `src/ai/tools/extract-financial-data.test.ts`
- [x] Create `src/ai/tools/categorize-line-items.test.ts`
- [x] Mock Claude API for deterministic testing

---

## Phase 4: Agent Layer

### 4.1 Financial Extraction Agent
- [ ] Create `src/agent/financial-extraction-agent.ts`
- [ ] Implement orchestration: parse -> extract -> categorize -> validate
- [ ] Handle multi-page documents
- [ ] Support incremental extraction for large files

### 4.2 Agent Configuration
- [ ] Define agent decision tree (when to use which tools)
- [ ] Implement retry logic with exponential backoff
- [ ] Add progress reporting callbacks

### 4.3 Agent Tests
- [ ] Create `src/agent/financial-extraction-agent.test.ts`
- [ ] Test full extraction pipeline
- [ ] Test error recovery scenarios

---

## Phase 5: Export Layer

### 5.1 Excel Export
- [ ] Create `src/export/excel-export.ts`
- [ ] Define workbook structure (Revenue, Expenses, Adjustments sheets)
- [ ] Include formatting (headers, totals, conditional formatting)
- [ ] Add metadata sheet (timestamp, source file, agent reasoning)

### 5.2 Export Tests
- [ ] Create `src/export/excel-export.test.ts`
- [ ] Verify workbook structure
- [ ] Test with various data volumes

---

## Phase 6: API Layer

### 6.1 Parse Document API
- [ ] Implement `src/api/parse-document.ts` (currently stub)
- [ ] Accept: file buffer/URL, options
- [ ] Return: DirectCapitalizationRateModel + metadata
- [ ] Add request validation with Zod schemas

### 6.2 Export Excel API
- [ ] Implement `src/api/export-excel.ts` (currently stub)
- [ ] Accept: DirectCapitalizationRateModel
- [ ] Return: Excel buffer or file path
- [ ] Support streaming for large files

### 6.3 API Tests
- [ ] Create `src/api/parse-document.test.ts`
- [ ] Create `src/api/export-excel.test.ts`
- [ ] Test end-to-end workflows

---

## Phase 7: Integration - MAP05

> **NOTE: FOR DOCUMENTATION ONLY**
>
> MAP05 is a separate production application. The tasks below document HOW to integrate PARSE-N-FILL into MAP05, but the actual integration work will be done in the MAP05 repository, NOT here. Do NOT edit files in `/mnt/c/PARSE-N-FILL/MAP05/`.

### 7.1 AI Tool Integration (in MAP05 repo)
- [ ] Create tool in MAP05: `src/lib/ai/tools/parse-financial-document.ts`
- [ ] Import parse-n-fill module
- [ ] Map to existing file infrastructure (uploadedFiles table)

### 7.2 API Route (optional, in MAP05 repo)
- [ ] Create `src/app/api/parse-financial/route.ts` in MAP05
- [ ] Use existing auth (Supabase)
- [ ] Leverage existing file storage

### 7.3 Integration Tests (in MAP05 repo)
- [ ] Test with MAP05's uploaded files
- [ ] Verify data flows to POI/table system

---

## Phase 8: Integration - other_branch

> **NOTE: FOR DOCUMENTATION ONLY**
>
> other_branch is a separate production application. The tasks below document HOW to integrate PARSE-N-FILL into other_branch, but the actual integration work will be done in the other_branch repository, NOT here. Do NOT edit files in `/mnt/c/PARSE-N-FILL/other_branch/`.

### 8.1 API Route (in other_branch repo)
- [ ] Create `src/app/api/parse-document/route.ts` in other_branch
- [ ] Use Clerk auth (`auth()` from `@clerk/nextjs/server`)
- [ ] Accept file upload or session file reference

### 8.2 Type Mapping (in other_branch repo)
- [ ] Map DirectCapitalizationRateModel -> RevenueStream[]
- [ ] Map DirectCapitalizationRateModel -> ExpenseRow[]
- [ ] Map to PropertyData if property info detected

### 8.3 Session Integration (in other_branch repo)
- [ ] Update session with parsed data via `/api/sessions/drafts/[id]`
- [ ] Pre-populate Zustand store from parsed results

### 8.4 Integration Tests (in other_branch repo)
- [ ] Test with other_branch session workflow
- [ ] Verify financial calculations work with parsed data

---

## Phase 9: Quality & Documentation

### 9.1 Test Coverage
- [ ] Achieve >80% test coverage
- [ ] Add integration tests with real documents
- [ ] Performance benchmarks

### 9.2 Documentation
- [ ] Update README.md with usage examples
- [ ] Document integration patterns for both apps
- [ ] Add API reference documentation

### 9.3 Error Handling
- [ ] Comprehensive error messages
- [ ] Logging with context
- [ ] User-friendly error responses

---

## Key Files Reference

### PARSE-N-FILL (Core Module)
| File | Status | Purpose |
|------|--------|---------|
| `src/types/direct-cap-model.ts` | ✅ Complete | Core interfaces |
| `src/schemas/direct-cap-schema.ts` | ✅ Complete | Zod validation |
| `src/api/parse-document.ts` | Stub | Main parse API |
| `src/api/export-excel.ts` | Stub | Excel export API |
| `src/parsers/*` | ✅ Complete | File parsers (PDF, Excel, CSV, Image) |
| `src/ai/config.ts` | ✅ Complete | Claude config |
| `src/ai/prompts/*` | ✅ Complete | System prompts |
| `src/ai/tools/*` | ✅ Complete | AI tools (extraction, categorization) |
| `src/agent/*` | Empty | Extraction agent |
| `src/export/*` | Empty | Excel generation |
| `src/lib/*` | ✅ Complete | Utilities (errors, constants, utils) |

### MAP05 Reference Files (READ-ONLY - Do NOT edit)
| File | Purpose |
|------|---------|
| `src/lib/ai/tools/index.ts` | Reference: Tool factory pattern |
| `src/lib/file-parser.ts` | Reference: File parsing patterns |
| `src/app/actions/chat.ts` | Reference: Agent orchestration |
| `src/db/schema.ts` | Reference: uploadedFiles table schema |

### other_branch Reference Files (READ-ONLY - Do NOT edit)
| File | Purpose |
|------|---------|
| `src/stores/types.ts` | Reference: RevenueStream, ExpenseRow types |
| `src/lib/services/financial-calculations.service.ts` | Reference: Financial calculation patterns |
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

## Success Criteria

- [ ] Parse PDF rent rolls and extract revenue line items
- [ ] Parse Excel operating statements and extract expenses
- [ ] Output valid DirectCapitalizationRateModel JSON
- [ ] Generate formatted Excel export
- [ ] Integrate with MAP05 AI assistant
- [ ] Integrate with other_branch BOV workflow
- [ ] >80% test coverage
- [ ] Documentation complete

---

## Notes

> **IMPORTANT: MAP05 and other_branch are READ-ONLY reference projects.**
> Do NOT edit files in those directories. Study their patterns, but implement all code in PARSE-N-FILL only.

- MAP05 uses GPT-5.1 for file parsing; parse-n-fill uses Claude for financial extraction
- other_branch has no document parsing - parse-n-fill fills this gap completely
- Both apps use Vercel AI SDK - consistent patterns available
- Zod validation is standard across all three codebases
- Integration phases (7 & 8) document HOW to integrate, not tasks to do here

---

## Review Log

| Date | Phase | Status | Notes |
|------|-------|--------|-------|
| 2024-12-13 | Phase 1 | ✅ Passed | AI config, prompts, utilities reviewed. Fixed exports and formatCurrency edge case. |
| 2024-12-14 | Phase 2 | ✅ Passed | Parser layer complete. 4 parsers (PDF, Excel, CSV, Image) with 45 passing tests. Used Claude vision for PDFs/images, ExcelJS/PapaParse for structured files. Fixed AI SDK v5 `maxOutputTokens` param and safe ArrayBuffer handling. |
| 2025-12-14 | Phase 3 | ✅ Passed | AI tools layer complete. 2 tools (extractFinancialData, categorizeLineItems) with 29 passing tests. Used Vercel AI SDK `tool()` and `generateObject()` for structured extraction. Fixed AI SDK v5 `inputSchema` (not `parameters`) and model type compatibility. Total: 74 tests passing. |
