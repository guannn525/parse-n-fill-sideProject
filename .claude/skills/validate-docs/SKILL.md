---
name: validate-docs
description: "Systematically validate markdown documentation files against actual implementation, then generate a comprehensive fix plan with exact Edit commands to resolve all issues. Ensures accuracy, consistency, and up-to-date technical claims across the codebase."
allowed-tools: Read, Glob, Grep, Bash
last-updated: 2025-12-20
last-audit: 2025-12-20
audit-interval-days: 60
version: 1.0.0
category: quality
tags: documentation, validation, accuracy, maintenance
outputs: Documentation validation report with fix plan
---

# Validate Documentation

Systematically compare markdown documentation files with the actual codebase implementation to ensure accuracy, consistency, and currency of all technical claims and references.

## When to Use This Skill

**Use this skill when:**

- Documentation might be outdated after code changes
- Major dependency updates (Vercel AI SDK, ExcelJS, etc.)
- Before production releases to ensure accuracy
- After refactoring or architecture changes
- New team members report documentation confusion

**Key Feature:** After validation, the skill generates a comprehensive fix plan with exact Edit commands ready to execute.

**Don't use when:**

- Writing initial documentation for new features
- Documentation is purely conceptual (no technical claims)
- Changes are minor and don't affect documented patterns

## Core Validation Principles

### 1. Evidence-Based Verification

- Don't assume documentation is correct
- Verify every technical claim against actual code

### 2. Systematic Coverage

Validate across multiple dimensions:

- **Versions**: Dependencies, AI model versions
- **File Paths**: All referenced files exist
- **APIs**: Integration claims match implementation
- **Commands**: Scripts work as documented

### 3. Categorized Reporting

**Critical** (Fix immediately):

- Broken file references
- Wrong version claims
- Non-existent commands

**Important** (Fix soon):

- Outdated patterns
- Missing new features
- Incomplete examples

**Minor** (Improve when time permits):

- Formatting inconsistencies
- Could be clearer

---

## Step-by-Step Validation Process

### Step 1: Determine Validation Scope

#### Full Documentation Audit

```bash
"Validate all markdown files against implementation"
```

Checks: CLAUDE.md, ARCHITECTURE.md, AGENT_DESIGN.md, README.md, PROGRESS.md

#### Targeted Validation

```bash
"Validate CLAUDE.md against current implementation"
"Check if ARCHITECTURE.md patterns match actual code"
```

### Step 2: Discover All Documentation Files

```bash
# Find all markdown documentation
find . -name "*.md" -not -path "./node_modules/*" -not -path "./other_branch/*" | head -20
```

Create inventory:

```markdown
## Documentation Files Found

### Core Documentation

- CLAUDE.md - Main developer guide
- ARCHITECTURE.md - Technical architecture
- AGENT_DESIGN.md - AI agent design principles
- README.md - Project overview
- PROGRESS.md - Development progress
```

### Step 3: Validate Version Claims

#### 3.1 Check Package Dependencies

```bash
# Get actual versions from package.json
cat package.json | jq '{
  name: .name,
  ai_sdk: .dependencies.ai,
  google_ai: .dependencies["@ai-sdk/google"],
  typescript: .devDependencies.typescript,
  exceljs: .dependencies.exceljs,
  papaparse: .dependencies.papaparse,
  zod: .dependencies.zod
}'
```

#### 3.2 Compare Against Documentation Claims

```markdown
## Version Claims Audit

### CLAUDE.md Claims vs Reality

| Technology    | Claimed | Actual    | Status  |
| ------------- | ------- | --------- | ------- |
| Vercel AI SDK | "5.x"   | "^5.0.0"  | CORRECT |
| TypeScript    | "5.x"   | "^5.7.2"  | CORRECT |
| Zod           | "3.x"   | "^3.24.0" | CORRECT |
| Gemini Model  | "Flash" | "Flash"   | CORRECT |

### Issues Found

1. CLAUDE.md line 23: Claims "X" but package.json shows "Y"
```

### Step 4: Validate File Path References

#### 4.1 Extract All File References

```bash
# Find all file path references in documentation
grep -r "src/[a-zA-Z0-9/_\-\.]*" *.md | grep -v "node_modules" | head -20
```

#### 4.2 Verify Each Path Exists

```bash
# Check if referenced files exist
for path in "src/types/revenue-stream.ts" "src/parsers/pdf-parser.ts" "src/ai/tools/extract-revenue-streams.ts"; do
  if [ -f "$path" ]; then
    echo "$path exists"
  else
    echo "$path: NOT FOUND"
  fi
done
```

### Step 5: Validate Command References

#### 5.1 Check package.json Scripts

```bash
cat package.json | jq '.scripts'
```

#### 5.2 Compare Against Documentation

```bash
# Find all npm/command references in docs
grep -r "npm run\|npm install\|npm test" *.md
```

Example validation:

```markdown
## Command Validation Audit

### README.md Commands

- "npm run dev" -> exists in package.json
- "npm run build" -> exists in package.json
- "npm test" -> exists in package.json
- "npm run typecheck" -> exists in package.json

### Issues Found

1. README.md mentions "npm run format" but script doesn't exist
```

### Step 6: Check AI Tool Documentation

Verify AI tools documented match implementation:

```bash
# Find all tool files
find src/ai/tools -name "*.ts" ! -name "index.ts"

# Check what's documented in AGENT_DESIGN.md
grep -E "extract|categorize|validate" AGENT_DESIGN.md
```

### Step 7: Validate Environment Variables

```bash
# Check .env.example
cat .env.example

# Compare against documentation
grep -r "GOOGLE_GENERATIVE_AI_API_KEY\|GEMINI_MODEL\|LOG_LEVEL" *.md
```

### Step 8: Generate Comprehensive Report

````markdown
# Documentation Validation Report

**Generated:** [Date]
**Scope:** Full documentation audit
**Files Validated:** X markdown files
**Issues Found:** X (Y critical, Z important)

---

## Critical Issues (Fix Immediately)

### 1. Version Inconsistencies

| File      | Line | Claimed | Actual | Fix           |
| --------- | ---- | ------- | ------ | ------------- |
| CLAUDE.md | 23   | "X"     | "Y"    | Update to "Y" |

### 2. Broken File References

| File            | Line | Reference                 | Status    |
| --------------- | ---- | ------------------------- | --------- |
| ARCHITECTURE.md | 45   | src/parsers/old-parser.ts | NOT FOUND |

### 3. Missing Commands

| File      | Line | Command        | Status    |
| --------- | ---- | -------------- | --------- |
| README.md | 67   | npm run format | NOT FOUND |

---

## Fix Plan

### Fix 1.1: Update Version References

```bash
Edit({
  file_path: "CLAUDE.md",
  old_string: "claimed version",
  new_string: "actual version"
});
```
````

### Fix 1.2: Remove Broken References

```bash
Edit({
  file_path: "ARCHITECTURE.md",
  old_string: "broken reference line",
  new_string: "corrected line or remove"
});
```

---

## Verification Checklist

After implementing fixes:

- [ ] All version claims match package.json
- [ ] All referenced files exist
- [ ] All npm commands exist in package.json
- [ ] All environment variables documented
- [ ] AI tool documentation matches implementation

````

### Step 9: Execute Fix Plan

After user approval:

1. Execute Edit commands from fix plan
2. Run `npm run typecheck` to verify no breaks
3. Run `npm run lint` to check formatting
4. Commit changes: `docs: fix validation issues`

---

## Common Issues and Fixes

### Issue: "Documentation shows old file paths"

**Cause:** Files moved/renamed but docs not updated

**Detection:**

```bash
grep -o "src/[a-zA-Z0-9/_\-\.]*" *.md | sort -u | while read path; do
  [ -f "$path" ] || echo "Missing: $path"
done
````

### Issue: "npm commands don't work"

**Cause:** Scripts renamed in package.json but docs not updated

**Detection:**

```bash
# Compare documented vs actual scripts
grep -o "npm run [a-z:-]\+" *.md | cut -d' ' -f3 | sort -u > /tmp/doc-scripts.txt
jq -r '.scripts | keys[]' package.json | sort > /tmp/actual-scripts.txt
diff /tmp/doc-scripts.txt /tmp/actual-scripts.txt
```

### Issue: "AI model version outdated"

**Cause:** Model upgraded but docs not updated

**Detection:**

```bash
# Check what model is actually configured
grep -r "gemini" src/ai/config.ts
# Compare against docs
grep -r "gemini\|claude\|gpt" CLAUDE.md ARCHITECTURE.md
```

---

## References

- [ARCHITECTURE.md](../../../ARCHITECTURE.md) - File organization standards
- [AGENT_DESIGN.md](../../../AGENT_DESIGN.md) - AI tool design patterns
- [CLAUDE.md](../../../CLAUDE.md) - Project-specific guidelines

---

## Final Validation Checklist

Before considering documentation validated:

### Technical Accuracy

- [ ] All version claims match package.json
- [ ] All file references exist in codebase
- [ ] All npm commands work as documented
- [ ] All environment variables documented
- [ ] AI tool documentation matches implementation

### Content Consistency

- [ ] No conflicting claims between files
- [ ] Terminology used consistently
- [ ] Examples follow current patterns

### Completeness

- [ ] All implemented features documented
- [ ] All required setup steps included
- [ ] All dependencies listed

---

## Success Metrics

**Good Documentation Validation:**

- 0 critical issues (broken references, wrong versions)
- <3 important issues (outdated patterns)
- Issues categorized with clear fix proposals
- Evidence provided for all claims
- **Comprehensive fix plan with exact Edit commands**

**Output Quality:**

- Actionable recommendations with line numbers
- Copy-paste fix commands where possible
- Prioritized by impact
