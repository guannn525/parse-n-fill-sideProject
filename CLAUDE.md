# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PARSE-N-FILL** is a modular rent roll parsing API powered by Gemini AI. It extracts structured revenue stream data from documents (PDF, Excel, CSV, images) and outputs RevenueStream[] format compatible with income-approach commercial real estate analysis.

**Core Purpose**: Parse rent rolls → Extract unit-level revenue data → Categorize into Residential/Commercial/Miscellaneous → Output RevenueStream[] JSON

## File Organization

### Directory Structure

```
src/
├── types/              # TypeScript interfaces
│   └── revenue-stream.ts
├── parsers/            # File parsing utilities
│   ├── index.ts        # Parser factory
│   ├── pdf-parser.ts   # Gemini vision for PDFs
│   ├── excel-parser.ts # ExcelJS + PapaParse
│   ├── csv-parser.ts   # PapaParse
│   └── image-parser.ts # Gemini vision for images
├── ai/
│   ├── config.ts       # Gemini model configuration
│   ├── prompts/        # System prompts
│   │   ├── extraction-prompt.ts
│   │   └── revenue-stream-prompt.ts
│   └── tools/          # AI agent tools + Zod schemas
│       ├── extract-revenue-streams.ts  # Extraction + categorization
│       ├── revenue-stream-types.ts     # Zod schemas
│       ├── extract-financial-data.ts
│       └── categorize-line-items.ts
├── agent/              # Revenue extraction agent
│   └── revenue-extraction-agent.ts
├── export/             # Excel export utilities
│   └── excel-export.ts
├── api/                # API handlers
│   ├── parse-document.ts
│   └── export-excel.ts
└── lib/                # Shared utilities
    ├── errors.ts
    └── constants.ts
```

### Quick Reference

- **Types** → `src/types/`
- **Zod Schemas** → `src/ai/tools/*-types.ts`
- **File Parsers** → `src/parsers/`
- **AI Configuration** → `src/ai/config.ts`
- **AI Tools** → `src/ai/tools/`
- **AI Prompts** → `src/ai/prompts/`
- **Agent Logic** → `src/agent/`
- **Excel Export** → `src/export/`
- **API Handlers** → `src/api/`
- **Utilities** → `src/lib/`

## Key Technologies

| Technology        | Version   | Purpose                                 |
| ----------------- | --------- | --------------------------------------- |
| **Gemini API**    | Flash 2.0 | Document parsing & reasoning            |
| **Vercel AI SDK** | 5.x       | AI integration (`ai`, `@ai-sdk/google`) |
| **TypeScript**    | 5.x       | Type safety (strict mode)               |
| **Zod**           | 3.x       | Runtime validation                      |
| **ExcelJS**       | 4.x       | Excel file parsing & generation         |
| **PapaParse**     | 5.x       | CSV parsing                             |
| **Vitest**        | 4.x       | Testing framework                       |

## Architecture Overview

### Data Flow

```
Document (PDF/Excel/CSV/Image)
    ↓
Parser Layer (Gemini vision or ExcelJS/PapaParse)
    ↓
Parsed Text Content
    ↓
AI Agent (extractRevenueStreams tool)
    ↓ (extraction + categorization in one step)
    ↓
RevenueStream[] JSON (with categories assigned)
    ↓
Excel Export (optional)
```

### Core Interface

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
  monthlyRate: number | null; // AI extracts if in document
  annualIncome: number | null; // AI extracts if in document
  isVacant: boolean;
}
```

**Note:** UI calculates Vac %, Effective, $/SF from these base fields.

### AI Agent Design

- **Principle**: "Agents decide, tools execute"
- **Model**: Gemini Flash 2.0 (default) or Gemini Pro 2.0 (complex documents)
- **Tools**: Use Vercel AI SDK tool pattern with Zod schemas
- **Prompts**: Centralized in `src/ai/prompts/`

## Development Commands

```bash
npm install           # Install dependencies
npm run dev           # Development mode
npm run build         # Production build
npm run typecheck     # Type checking only
npm run lint          # Run linting
npm test              # Run tests
npm run test:watch    # Watch mode tests
```

## Environment Variables

Required in `.env`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

Optional:

```bash
GEMINI_MODEL=gemini-2.0-flash-exp  # Override default model
LOG_LEVEL=debug                     # Enable debug logging
```

## Code Style & Quality

### TypeScript

- **Strict mode** enabled
- Use `interface` for public types, `type` for internal unions
- Prefer `unknown` over `any`
- Always validate external input with Zod

### Naming Conventions

| Type       | Convention          | Example                 |
| ---------- | ------------------- | ----------------------- |
| Files      | kebab-case          | `revenue-stream.ts`     |
| Interfaces | PascalCase          | `RevenueStream`         |
| Functions  | camelCase           | `parseDocument`         |
| Constants  | UPPER_SNAKE         | `SUPPORTED_FILE_TYPES`  |
| AI Tools   | camelCase verb+noun | `extractRevenueStreams` |

### AI Tool Pattern

```typescript
import { tool } from "ai";
import { z } from "zod";

export const myTool = tool({
  description: "Clear description for the agent",
  inputSchema: z.object({
    param: z.string().describe("Parameter description"),
  }),
  execute: async ({ param }) => {
    // Implementation - return structured result, never throw
    return { success: true, data: result };
  },
});
```

### Error Handling

- Use custom error classes from `src/lib/errors.ts`
- Return structured error responses, don't throw in tools
- Log errors with context for debugging

## Testing

Tests live next to source files:

```
src/parsers/pdf-parser.ts
src/parsers/pdf-parser.test.ts
```

Run tests:

```bash
npm test                    # All tests
npm test -- --watch        # Watch mode
npm test -- pdf-parser     # Specific file
```

## Integration Points

### other_branch Integration

```typescript
// In other_branch: src/app/api/parse-document/route.ts
import { parseDocument } from "parse-n-fill";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  const result = await parseDocument(body);

  // result.revenueStreams is compatible with SubModule.data.revenueStreams
  return Response.json(result);
}
```

### Mapping to other_branch Types

The output RevenueStream[] format is designed to be compatible with other_branch's income-approach module:

```typescript
// PARSE-N-FILL output maps directly to other_branch types
// other_branch: src/stores/types.ts

// RevenueStream → SubModule.data.revenueStreams
// RevenueRow → individual rows within each stream
// category: 'Residential' | 'Commercial' | 'Miscellaneous'
```

## Git Workflow

### Commit Format

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:

```
feat(parser): add PDF table extraction
fix(agent): handle empty documents gracefully
docs(readme): update API examples
```

## Additional Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture details
- **[AGENT_DESIGN.md](./AGENT_DESIGN.md)** - AI agent patterns and prompts
- **[README.md](./README.md)** - Project overview and quick start

## Reference Projects

> **IMPORTANT: READ-ONLY REFERENCE**
>
> The following project is included **FOR REFERENCE ONLY**. Do NOT modify, edit, or commit changes to this codebase. It is a separate production application with its own development workflow.

This project adapts patterns from:

- **other_branch** (`/mnt/c/PARSE-N-FILL/other_branch/`) - Reference for income-approach types and revenue stream structure
  - Study: `src/stores/types.ts` (RevenueStream, RevenueRow interfaces)
  - Study: `src/app/(app)/bov/_components/underwriting-tab/income-approach/` (UI structure)
  - DO NOT EDIT - read-only reference

When implementing features in PARSE-N-FILL, you may:

- Read and study patterns from other_branch
- Copy/adapt type definitions into PARSE-N-FILL
- Reference its architecture decisions

You must NOT:

- Edit files in other_branch/
- Create commits in that directory
- Run its dev server or tests (unless explicitly asked)
