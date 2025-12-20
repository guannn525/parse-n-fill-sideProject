---
name: cleanup-codebase
description: "Remove temporary files, test helpers, debug statements, commented code, and orphaned files to keep codebase clean. Use when preparing commits, after feature completion, or during regular maintenance."
allowed-tools: Read, Grep, Glob, Bash
last-updated: 2025-12-20
last-audit: 2025-12-20
audit-interval-days: 90
version: 1.1.0
category: quality
tags: cleanup, maintenance, dead-code, debug, temporary-files
outputs: Cleanup report with actionable items
---

# Cleanup Codebase

Systematically identify and remove temporary files, debug code, and clutter to maintain a clean, production-ready codebase.

## When to Use This Skill

- Before committing code (pre-commit hygiene)
- After completing a feature (cleanup test helpers)
- After major refactoring (remove old code)
- Weekly/monthly maintenance
- When repository feels cluttered
- Preparing for code review or release

## Instructions

### Bash Tool Best Practices

**IMPORTANT**: This skill uses complex bash scripts that can encounter escaping issues. To avoid errors:

1. **Use script files for complex logic**: Wrap complex bash in heredoc and save to `/tmp/script.sh`
2. **Use `case` statements instead of `[[ ]]` regex**: Avoids escaping issues with `=~` operator
3. **Use single quotes in heredocs**: `<< 'EOFSCRIPT'` prevents variable expansion issues

### EXECUTION CHECKLIST (MANDATORY)

**Before proposing ANY deletions, verify you have completed ALL of these:**

- [ ] Run Category A detection (temporary test files)
- [ ] Run Category B detection (debug statements)
- [ ] Run Category C detection (commented code)
- [ ] Run Category D detection (orphaned files)
- [ ] Run Category E detection (backup files)
- [ ] Run Category F detection (TODO comments)
- [ ] Run Category G detection (log files)
- [ ] Run Category H detection (unused exports)
- [ ] Run Category S detection (cascading barrel dead code)
- [ ] Generated comprehensive scan report with counts
- [ ] Shown full report to user BEFORE deleting anything
- [ ] Got explicit user approval for deletions

### Step 1: Run Mandatory Auto-Scan

**CRITICAL**: ALWAYS run a comprehensive auto-scan BEFORE asking the user what to cleanup.

| Category | Risk/Impact | Description                |
| -------- | ----------- | -------------------------- |
| A        | MEDIUM/LOW  | Temporary test files       |
| B        | MEDIUM/LOW  | Debug statements           |
| C        | HIGH/LOW    | Commented code             |
| D        | HIGH/HIGH   | Orphaned files             |
| E        | LOW/LOW     | Backup files               |
| F        | HIGH/LOW    | TODO comments              |
| G        | LOW/LOW     | Log files                  |
| H        | MEDIUM/LOW  | Unused exports             |
| S        | HIGH/HIGH   | Cascading barrel dead code |

**Quick Scan**:

```bash
echo "Codebase Scan Summary..."
echo ""
echo "Category A (Test files): $(find src -name "*test-helper*" -o -name "*-old.test.ts" 2>/dev/null | wc -l)"
echo "Category B (Debug statements): $(grep -r "console\.log\|debugger;" src/ --include="*.ts" 2>/dev/null | wc -l)"
echo "Category C (Commented code): $(grep -rn "^[[:space:]]*\/\/" src/ --include="*.ts" | awk -F: '{print $1}' | uniq -c | awk '$1 > 5 {print $2}' | wc -l) files with >5 comment lines"
echo "Category E (Backup files): $(find . -name "*.bak" -o -name "*.old" -o -name "*.tmp" 2>/dev/null | wc -l)"
echo "Category G (Log files): $(find . -name "*.log" 2>/dev/null | wc -l)"
```

**Show summary to user**:

```
Cleanup Scan Summary:
- Temp test files: [count]
- Debug statements: [count]
- Commented code files: [count]
- Orphaned files: [count]
- Backup files: [count]
- TODO comments: [count]
- Log files: [count]
- Barrel dead code: [count]
```

**Then ask user what to cleanup**:

1. **All recommended**: Clean everything marked as high priority
2. **Specific categories**: Choose which categories to clean
3. **Specific files**: Review and select individual files
4. **Cancel**: Skip cleanup

### Step 2: Identify Cleanup Candidates

#### Category A: Temporary Test Files [RISK: MEDIUM] [IMPACT: LOW]

```bash
# Find test helpers in src/ (should be colocated or in test utils)
find src -name "*test-helper*" -o -name "*test-util*" -o -name "*mock-*"

# Find orphaned test files
cat > /tmp/find_orphaned_tests.sh << 'EOFSCRIPT'
#!/bin/bash
find src -name "*.test.ts" | while read f; do
  dir=$(dirname "$f")
  base=$(basename "$f" .test.ts)

  if [ ! -f "$dir/$base.ts" ]; then
    echo "Orphaned test: $f"
  fi
done
EOFSCRIPT

chmod +x /tmp/find_orphaned_tests.sh
/tmp/find_orphaned_tests.sh
```

#### Category B: Debug Statements [RISK: MEDIUM] [IMPACT: LOW]

```bash
# Find console.log (exclude intentional logging)
grep -rn "console\.log\|console\.debug" src/ --include="*.ts" | grep -v "// Keep:"

# Find debugger statements
grep -rn "debugger;" src/ --include="*.ts"
```

#### Category C: Commented Code [RISK: HIGH] [IMPACT: LOW]

```bash
# Find files with multiple consecutive comment lines (likely commented code)
grep -rn "^[[:space:]]*\/\/" src/ --include="*.ts" | \
  awk -F: '{print $1}' | uniq -c | awk '$1 > 5 {print $2}'
```

#### Category D: Orphaned Files [RISK: HIGH] [IMPACT: HIGH]

```bash
cat > /tmp/find_orphaned.sh << 'EOFSCRIPT'
#!/bin/bash
find src -type f -name "*.ts" | while read file; do
  basename=$(basename "$file")
  filename="${basename%.*}"

  # Skip index files
  case "$file" in
    *index.ts) continue ;;
  esac

  # Check if file is imported (excluding itself and test files)
  imports=$(grep -r "from ['\"].*$filename" src/ --include="*.ts" 2>/dev/null | grep -v "$file" | grep -v ".test." | wc -l)

  if [ "$imports" -eq 0 ]; then
    echo "Orphaned file (not imported): $file"
  fi
done
EOFSCRIPT

chmod +x /tmp/find_orphaned.sh
/tmp/find_orphaned.sh
```

#### Category E: Old Backup Files [RISK: LOW] [IMPACT: LOW]

```bash
# Common backup patterns
find . -name "*.bak" -o -name "*.old" -o -name "*.tmp" -o -name "*~"

# Files ending with copy/backup
find src -name "*-copy.ts" -o -name "*-backup.ts" -o -name "*-old.ts"
```

#### Category F: Completed TODO Comments [RISK: HIGH] [IMPACT: LOW]

```bash
# Find TODO comments
grep -rn "TODO:\|FIXME:\|HACK:\|XXX:" src/ --include="*.ts"
```

Manual review needed to determine if completed.

#### Category G: Large Debug/Log Files [RISK: LOW] [IMPACT: LOW]

```bash
# Find large log files
find . -name "*.log" -size +1M

# Find debug output files
find . -name "debug-*" -o -name "output-*"
```

#### Category H: Unused Exports [RISK: MEDIUM] [IMPACT: LOW]

```bash
# Find exported functions/types not used elsewhere
cat > /tmp/find_unused_exports.sh << 'EOFSCRIPT'
#!/bin/bash
find src -name "*.ts" ! -name "index.ts" ! -name "*.test.ts" | while read file; do
  # Extract exports
  exports=$(grep -E "^export (const|function|interface|type|class)" "$file" | \
    sed 's/export \(const\|function\|interface\|type\|class\) \([a-zA-Z_][a-zA-Z0-9_]*\).*/\2/')

  for exp in $exports; do
    # Check if used elsewhere
    uses=$(grep -r "$exp" src/ --include="*.ts" 2>/dev/null | grep -v "$file" | grep -v ".test." | wc -l)
    if [ "$uses" -eq 0 ]; then
      echo "Unused export: $exp in $file"
    fi
  done
done
EOFSCRIPT

chmod +x /tmp/find_unused_exports.sh
/tmp/find_unused_exports.sh
```

#### Category S: Cascading Barrel Dead Code [RISK: HIGH] [IMPACT: HIGH]

**Problem**: Files can be exported through barrel files (index.ts) and re-exported through cascading barrels (e.g., src/ai/tools/index.ts → src/index.ts), making them appear "used" when their exported symbols are never actually imported by application code.

**Detection Strategy**:

1. Find files that are ONLY imported by index.ts files (barrel exports)
2. Extract all exported symbols from those files
3. Check if ANY of those symbols are imported anywhere in actual application code
4. Flag files where 0 symbols are used as DEAD CODE

```bash
cat > /tmp/find_barrel_dead_code.sh << 'EOFSCRIPT'
#!/bin/bash

# Find all non-index, non-test TypeScript files in src/
find src -type f -name "*.ts" ! -name "index.ts" ! -name "*.test.ts" | while read file; do
  basename=$(basename "$file")
  filename="${basename%.*}"

  # Find all files that import this file
  importers=$(grep -l "from ['\"].*$filename" src/ --include="*.ts" 2>/dev/null | grep -v "^$file$")

  # Check if file is ONLY imported by index.ts files
  non_barrel_importers=$(echo "$importers" | grep -v "index.ts" | grep -c ".")
  barrel_importers=$(echo "$importers" | grep -c "index.ts")

  # If file is only imported by barrels (or not imported at all)
  if [ "$non_barrel_importers" -eq 0 ] && [ "$barrel_importers" -gt 0 ]; then
    # Extract all exported symbols from the file
    exports=$(grep -E "^export (const|function|interface|type|class|enum)" "$file" | \
      sed -E 's/export (const|function|interface|type|class|enum) ([a-zA-Z_][a-zA-Z0-9_]*).*/\2/')

    # Count how many of these symbols are actually used in app code
    used_count=0
    total_count=0
    unused_symbols=""

    for symbol in $exports; do
      total_count=$((total_count + 1))

      # Check if symbol is imported anywhere (excluding barrels, the file itself, and tests)
      uses=$(grep -r "import.*$symbol" src/ --include="*.ts" 2>/dev/null | \
        grep -v "index.ts" | \
        grep -v "^$file:" | \
        grep -v ".test.ts:" | \
        wc -l)

      if [ "$uses" -eq 0 ]; then
        case "$unused_symbols" in
          "") unused_symbols="$symbol" ;;
          *) unused_symbols="$unused_symbols, $symbol" ;;
        esac
      else
        used_count=$((used_count + 1))
      fi
    done

    # If NO symbols are used, this is dead code hidden behind barrels
    if [ "$total_count" -gt 0 ] && [ "$used_count" -eq 0 ]; then
      echo "DEAD CODE (barrel only): $file"
      echo "  Exported symbols (unused): $unused_symbols"
      echo "  Only re-exported through: $(echo "$importers" | grep "index.ts" | tr '\n' ' ')"
      echo ""
    elif [ "$used_count" -lt "$total_count" ]; then
      # Some symbols used, some not
      echo "PARTIALLY DEAD: $file"
      echo "  Used: $used_count/$total_count symbols"
      echo "  Unused symbols: $unused_symbols"
      echo ""
    fi
  fi
done
EOFSCRIPT

chmod +x /tmp/find_barrel_dead_code.sh
/tmp/find_barrel_dead_code.sh
```

**What This Detects**:

- Legacy/prototype files exported from `src/ai/tools/index.ts` but never used
- Old implementations re-exported through cascading barrels
- Files that "look" imported because of barrel exports but have zero actual usage

**Example**:

```
src/ai/tools/old-tool.ts
  ↓ exported from
src/ai/tools/index.ts
  ↓ re-exported from
src/index.ts
  ↓ but...
NO APPLICATION CODE IMPORTS ANY SYMBOLS FROM old-tool.ts
  = DEAD CODE
```

### Step 3: Categorize and Prioritize

Group findings by safety level:

**Safe to Auto-Remove** (with confirmation):

- .log files (git ignored)
- .bak, .old, .tmp files
- debugger; statements
- console.log in obvious debug patterns

**Review Before Removing** (could be intentional):

- Test helpers (might be shared)
- console.error (might be error logging)
- Commented code (might be documentation)
- Files with low import count (might be new)

**Manual Decision Required**:

- Orphaned files (could be entry points)
- TODO comments (need context)
- Files in src/ without imports (might be standalone)
- Barrel dead code (verify symbols truly unused)

### Step 4: Generate Cleanup Report

```markdown
## Cleanup Report - [Date]

### Summary

- Temp test files: [count] found
- Debug statements: [count] found
- Commented code blocks: [count] files
- Orphaned files: [count] found
- Backup files: [count] found
- TODO comments: [count] found
- Log files: [count] found ([size]MB)
- Barrel dead code: [count] found

---

### High Priority (Strongly Recommend Cleanup)

1. **src/ai/tools/old-tool.ts** (126 lines)
   - Status: No imports found
   - Last modified: 2 weeks ago
   - Safe to delete: YES

2. **src/ai/tools/legacy-parser.ts** (89 lines)
   - Status: BARREL DEAD CODE
   - Exported symbols: extractLegacyData, LegacyFormat
   - Only re-exported through: src/ai/tools/index.ts src/index.ts
   - Actual usage: 0 symbols used in application code
   - Safe to delete: YES

---

### Safe Auto-Remove (With Confirmation)

**Log Files**:

1. debug.log (2.3MB) - Debug output

**Debug Statements**:

1. Line 45 in pdf-parser.ts: `console.log("DEBUG:", data)`
2. Line 67 in agent.ts: `debugger;`

---

### Review Before Removing

1. **src/lib/test-utils.ts** (72 lines)
   - Test helper, but not imported anywhere
   - Could be: Shared test utility planned but not used yet

---

### What would you like to cleanup?

1. **High priority items** - Strongly recommended
2. **All safe items** - High priority + safe auto-remove
3. **Custom selection** - Choose specific items
4. **Review all** - Go through each item individually
5. **Cancel** - Skip cleanup
```

### Step 5: Get User Approval

Present report and ask for confirmation.

### Step 6: Backup Before Cleanup (Git Stash)

```bash
# Stash current state (including untracked)
git stash push -u -m "Pre-cleanup backup $(date +%Y-%m-%d-%H-%M)"

# Note the stash ID for potential recovery
git stash list | head -n 1
```

### Step 7: Execute Cleanup

Based on user approval:

**Remove files**:

```bash
rm -f path/to/file.old
rm -f debug.log
```

**Remove debug statements**:

```bash
# Using sed to remove console.log lines (create backup first)
cp file.ts file.ts.backup
sed -i '/console\.log/d' file.ts
git diff file.ts
rm file.ts.backup
```

**Remove barrel dead code**:

```bash
# 1. Remove the file
rm src/ai/tools/legacy-parser.ts

# 2. Remove from barrel export
# Edit src/ai/tools/index.ts to remove export line
```

### Step 8: Verify Cleanup Results

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Tests
npm test

# Build
npm run build
```

If any errors:

- Review what was deleted
- Restore from git stash if needed
- Fix broken imports

### Step 9: Document Cleanup

```markdown
## Cleanup Summary - [Date]

### Items Removed

- 3 backup files (.old, .bak)
- 1 log file (2.3MB)
- 8 console.log statements
- 2 debugger statements
- 1 orphaned test helper
- 2 barrel dead code files (215 lines total)

### Disk Space Freed

2.5MB

### Verification

- TypeScript compiles
- Tests pass
- Build succeeds

### Recovery

Backup stashed as: stash@{0} "Pre-cleanup backup 2025-01-15"
```

### Step 10: Unstash if Needed

```bash
# Restore from stash
git stash pop stash@{0}

# Or just view what was stashed
git stash show -p stash@{0}
```

## Key Patterns to Follow

### Safety First

Always backup before deleting:

**GOOD**:

```bash
git stash push -u -m "Pre-cleanup backup"
rm temp-files.ts
npm run typecheck
# If broken, restore
git stash pop
```

**BAD**:

```bash
rm -rf src/old/
# Oops! Needed that file!
```

### Confirm Before Deleting

Never auto-delete without approval.

### Verify After Cleanup

Always run verification:

```bash
npm run typecheck && npm test && npm run build
```

## Common Cleanup Scenarios

### Scenario 1: Pre-Commit Cleanup

**Cleanup**:

- console.log statements
- debugger statements
- Commented code from debugging
- Temporary test files

### Scenario 2: Post-Feature Cleanup

**Cleanup**:

- Test helpers created during development
- Experimental files that didn't make it
- Old implementations now refactored
- Backup files (.old, .bak)

### Scenario 3: Post-Refactoring Cleanup

**Cleanup**:

- Old files that were replaced
- Commented "before" code
- Orphaned utility functions
- Unused imports
- Barrel dead code from old architecture

### Scenario 4: Barrel Export Cleanup

**Cleanup**:

- Prototype files that were exported but never used
- Legacy implementations hidden behind re-exports
- Old tools/utilities still in barrel but unused

## References

- [ARCHITECTURE.md](../../../ARCHITECTURE.md) - File organization standards
- [CLAUDE.md](../../../CLAUDE.md) - Project-specific guidelines

## Checklist

### Pre-Cleanup (MANDATORY)

- [ ] Ran Category A detection (temp test files)
- [ ] Ran Category B detection (debug statements)
- [ ] Ran Category C detection (commented code)
- [ ] Ran Category D detection (orphaned files)
- [ ] Ran Category E detection (backup files)
- [ ] Ran Category F detection (TODOs)
- [ ] Ran Category G detection (log files)
- [ ] Ran Category H detection (unused exports)
- [ ] Ran Category S detection (cascading barrel dead code)
- [ ] Generated comprehensive cleanup report with all counts
- [ ] Shown full report to user BEFORE deleting

### Execution

- [ ] Created git stash backup before cleanup
- [ ] Got explicit user approval for each category
- [ ] Removed approved items

### Post-Cleanup Verification

- [ ] TypeScript compilation succeeds
- [ ] Tests pass
- [ ] Build succeeds
- [ ] No broken imports
- [ ] Documented what was removed
- [ ] Stash available for recovery if needed
