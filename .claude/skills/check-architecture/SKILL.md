---
name: check-architecture
description: "Validate code follows ARCHITECTURE.md and AGENT_DESIGN.md best practices including file organization, naming conventions, AI tool patterns, and Zod schema usage. Use before commits, during code review, or when refactoring."
allowed-tools: Read, Grep, Glob, Bash
last-updated: 2025-12-20
last-audit: 2025-12-20
audit-interval-days: 60
version: 1.0.0
category: quality
tags: architecture, validation, ai-tools, best-practices
outputs: Architecture validation report
---

# Check Architecture

Validate that code follows PARSE-N-FILL's architectural standards and best practices.

## When to Use This Skill

- Before committing code
- During code review
- After adding new features
- After adding new AI tools
- When files seem disorganized
- Checking if refactoring is needed
- Validating parser or agent implementations

## Instructions

### Step 1: Determine Scope

Ask the user what to check:

1. **Entire codebase** - Full architectural review
2. **Specific directory** - Check `src/parsers/`, `src/ai/tools/`, etc.
3. **Recent changes** - Check git diff/staged files
4. **Specific file** - Validate one file against standards

### Step 2: Read Standards Documentation

Review the relevant standards:

- `ARCHITECTURE.md` - File organization patterns
- `AGENT_DESIGN.md` - AI tool design patterns
- `CLAUDE.md` - Project-specific guidelines

### Step 3: Check File Organization

Verify files are in correct locations per ARCHITECTURE.md:

**Check Types**:

```bash
# All types should be in src/types/
find src/types -type f -name "*.ts" ! -name "index.ts"
```

**Expected location**:

- Types: `src/types/{type-name}.ts`
- Zod Schemas: `src/schemas/{schema-name}.ts`
- Parsers: `src/parsers/{parser-name}.ts`
- AI Tools: `src/ai/tools/{tool-name}.ts`
- AI Prompts: `src/ai/prompts/{prompt-name}.ts`
- Agent Logic: `src/agent/{agent-name}.ts`
- Export Utilities: `src/export/{export-name}.ts`
- API Handlers: `src/api/{handler-name}.ts`
- Utilities: `src/lib/{utility-name}.ts`

**Check AI Tools**:

```bash
# All AI tools should be in src/ai/tools/
find src/ai/tools -type f -name "*.ts" ! -name "index.ts"
```

**Check Parsers**:

```bash
# All parsers should be in src/parsers/
find src/parsers -type f -name "*.ts" ! -name "index.ts"
```

### Step 4: Validate Naming Conventions

Check file and code naming:

**File Names**:

```bash
# Find files not following kebab-case
find src -type f \( -name "*.tsx" -o -name "*.ts" \) | grep -v "node_modules" | grep "[A-Z]"
```

**Expected**:

- Files: `kebab-case.ts`
- Interfaces: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- AI Tools: `camelCase` verb+noun (e.g., `extractRevenueStreams`)

### Step 5: Check Test Colocation

Verify tests exist next to code:

```bash
# Find files without tests
for file in src/**/*.ts; do
  testfile="${file%.ts}.test.ts"
  if [[ ! -f "$testfile" ]] && [[ ! "$file" =~ "test" ]] && [[ ! "$file" =~ "index.ts" ]]; then
    echo "Missing test: $file"
  fi
done
```

**Expected**:

- `pdf-parser.ts` + `pdf-parser.test.ts`
- `extract-revenue-streams.ts` + `extract-revenue-streams.test.ts`

### Step 6: Validate AI Tool Structure

For files in `src/ai/tools/`:

**Check Tool File Structure**:

1. Has JSDoc comment at top
2. Imports from `ai` package
3. Imports Zod for schema
4. Exports tool using `tool()` function
5. Has `description` field
6. Has `parameters` with Zod schema
7. All parameters have `.describe()`
8. Has `execute` async function
9. Returns structured result `{ success, data?, error? }`

**Check Tool Naming**:

- Tool name: `camelCase` verb+noun (`extractRevenueStreams`)
- File name: `kebab-case.ts` (`extract-revenue-streams.ts`)
- Generic names NOT allowed: `handler.ts`, `tool.ts`

**Check Token Optimization**:

```typescript
// GOOD - Options in tool description
category: z.enum(["Residential", "Commercial", "Miscellaneous"]).describe("Revenue category");

// BAD - No options in description
category: z.string().describe("Category value");
```

### Step 7: Check Zod Schema Patterns

For files in `src/schemas/`:

**Check Schema Structure**:

1. Schema name matches type name (`RevenueStreamSchema` for `RevenueStream`)
2. Schema is exported
3. Type is inferred from schema with `z.infer<typeof Schema>`
4. Validation messages are clear

### Step 8: Check Import Patterns

Verify imports use relative paths correctly:

```bash
# Find overly deep relative imports (beyond 3 levels)
grep -r "from ['\"]\.\./\.\./\.\./\.\." src/
```

**Expected**:

- `import { X } from "../types"`
- `import { Y } from "./utils"`
- Avoid: `import { Z } from "../../../../lib/utils"`

### Step 9: Check for Large Files

Find files that need refactoring:

```bash
# Find files over 300 lines
find src -name "*.ts" | while read file; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt 300 ]; then
    echo "$file: $lines lines (consider splitting)"
  fi
done
```

### Step 10: Generate Report

Compile findings into a checklist:

```markdown
## Architecture Validation Report

### File Organization

- [ ] All types in `src/types/`
- [ ] All Zod schemas in `src/schemas/`
- [ ] All AI tools in `src/ai/tools/`
- [ ] All parsers in `src/parsers/`
- [ ] All prompts in `src/ai/prompts/`
- [ ] Utilities in `src/lib/`

### Naming Conventions

- [ ] Files use kebab-case
- [ ] Interfaces use PascalCase
- [ ] Functions use camelCase
- [ ] Constants use UPPER_SNAKE_CASE

### Test Coverage

- [ ] Tests colocated with code
- [ ] All parsers have tests
- [ ] All AI tools have tests

### AI Tools (if applicable)

- [ ] Tools follow AGENT_DESIGN.md patterns
- [ ] Tool descriptions are clear
- [ ] Parameters all have .describe()
- [ ] Error handling returns structured results
- [ ] No throwing in execute functions

### Zod Schemas

- [ ] Schemas match type definitions
- [ ] Validation messages are helpful
- [ ] Types inferred from schemas

### Code Quality

- [ ] No files over 300 lines
- [ ] No deep relative imports (>3 levels)
- [ ] Index files re-export properly

### Issues Found

{List specific issues}

### Recommendations

{Refactoring suggestions}
```

## Key Patterns to Check

### File Organization Violations

**VIOLATIONS**:

- AI tool in `src/` root instead of `src/ai/tools/`
- Type in `src/ai/` instead of `src/types/`
- Schema mixed with types
- Parser in wrong directory

### Naming Convention Violations

**VIOLATIONS**:

- `RevenueStream.ts` instead of `revenue-stream.ts`
- `extract_revenue()` instead of `extractRevenue()`
- `revenue_stream` instead of `revenueStream`

### AI Tool Violations

**VIOLATIONS**:

- No `.describe()` on parameters
- Throwing errors instead of returning `{ success: false }`
- Generic tool names (`handler`, `manager`)
- Missing result type definition

## References

- [ARCHITECTURE.md](../../../ARCHITECTURE.md) - File organization standards
- [AGENT_DESIGN.md](../../../AGENT_DESIGN.md) - AI tool design patterns
- [CLAUDE.md](../../../CLAUDE.md) - Project-specific guidelines

## Checklist

When running this skill:

- [ ] Scope determined (full codebase, directory, or specific files)
- [ ] Standards documentation reviewed
- [ ] File organization checked against ARCHITECTURE.md
- [ ] Naming conventions validated
- [ ] Test colocation verified
- [ ] AI tools checked against AGENT_DESIGN.md (if applicable)
- [ ] Zod schemas validated
- [ ] Import patterns checked
- [ ] Large files identified
- [ ] Comprehensive report generated with actionable items
