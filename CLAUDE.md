# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PARSE-N-FILL** is a modular financial document parsing API powered by Claude AI. It extracts structured financial data from documents (PDF, Excel, CSV, images) and outputs the Direct Capitalization Rate Model format used in commercial real estate valuation.

**Core Purpose**: Parse financial documents → Extract line items → Categorize into revenue/expenses/adjustments → Output auditable JSON

## File Organization

### Directory Structure

```
src/
├── types/              # TypeScript interfaces
│   └── direct-cap-model.ts
├── schemas/            # Zod validation schemas
│   └── direct-cap-schema.ts
├── parsers/            # File parsing utilities
│   ├── index.ts        # Parser factory
│   ├── pdf-parser.ts   # Claude vision for PDFs
│   ├── excel-parser.ts # ExcelJS + PapaParse
│   ├── csv-parser.ts   # PapaParse
│   └── image-parser.ts # Claude vision for images
├── ai/
│   ├── config.ts       # Claude model configuration
│   ├── prompts/        # System prompts
│   │   └── extraction-prompt.ts
│   └── tools/          # AI agent tools
│       ├── extract-financial-data.ts
│       └── categorize-line-items.ts
├── agent/              # Financial extraction agent
│   └── financial-extraction-agent.ts
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
- **Validation Schemas** → `src/schemas/`
- **File Parsers** → `src/parsers/`
- **AI Configuration** → `src/ai/config.ts`
- **AI Tools** → `src/ai/tools/`
- **Agent Logic** → `src/agent/`
- **Excel Export** → `src/export/`
- **API Handlers** → `src/api/`
- **Utilities** → `src/lib/`

## Key Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Claude API** | Sonnet 4.5 | Document parsing & reasoning |
| **Vercel AI SDK** | 5.x | AI integration (`ai`, `@ai-sdk/anthropic`) |
| **TypeScript** | 5.x | Type safety (strict mode) |
| **Zod** | 3.x | Runtime validation |
| **ExcelJS** | 4.x | Excel file parsing & generation |
| **PapaParse** | 5.x | CSV parsing |
| **Vitest** | 4.x | Testing framework |

## Architecture Overview

### Data Flow

```
Document (PDF/Excel/CSV/Image)
    ↓
Parser Layer (Claude vision or ExcelJS/PapaParse)
    ↓
Parsed Text Content
    ↓
AI Agent (extractFinancialData tool)
    ↓
Categorization (categorizeLineItems tool)
    ↓
DirectCapitalizationRateModel JSON
    ↓
Excel Export (optional)
```

### Core Interface

```typescript
interface DirectCapitalizationRateModel {
  timeStamp: string;                              // ISO timestamp
  agentReasoning: string;                         // AI explanation for audit
  annualOperatingRevenue: Record<string, number>; // Revenue items
  annualOperatingExpenses: Record<string, number>;// Expense items
  oneTimeAdjustment: Record<string, number>;      // One-time adjustments
}
```

### AI Agent Design

- **Principle**: "Agents decide, tools execute"
- **Model**: Claude Sonnet 4.5 (default) or Opus 4.5 (complex documents)
- **Tools**: Use Vercel AI SDK tool pattern with Zod schemas
- **Prompts**: Centralized in `src/ai/prompts/`

## Development Commands

```bash
npm install           # Install dependencies
npm run dev           # Development mode
npm run build         # Production build
npm run typecheck     # Type checking only
npm test              # Run tests
npm run test:watch    # Watch mode tests
```

## Environment Variables

Required in `.env`:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

Optional:

```bash
CLAUDE_MODEL=claude-sonnet-4-20250514  # Override default model
LOG_LEVEL=debug                         # Enable debug logging
```

## Code Style & Quality

### TypeScript

- **Strict mode** enabled
- Use `interface` for public types, `type` for internal unions
- Prefer `unknown` over `any`
- Always validate external input with Zod

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `direct-cap-model.ts` |
| Interfaces | PascalCase | `DirectCapitalizationRateModel` |
| Functions | camelCase | `parseDocument` |
| Constants | UPPER_SNAKE | `SUPPORTED_FILE_TYPES` |
| AI Tools | camelCase verb+noun | `extractFinancialData` |

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

### MAP05 Integration

```typescript
// In MAP05: src/app/api/parse-financial/route.ts
import { parseDocument } from 'parse-n-fill';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await parseDocument(body);
  return NextResponse.json(result);
}
```

### other_branch Integration

```typescript
// In other_branch: src/app/api/parse/route.ts
import { parseDocument } from 'parse-n-fill';
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  return Response.json(await parseDocument(body));
}
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

This project adapts patterns from:

- **MAP05** (`/mnt/c/PARSE-N-FILL/MAP05/`) - Primary reference for AI tools, file parsing
- **other_branch** (`/mnt/c/PARSE-N-FILL/other_branch/`) - Financial calculation patterns
