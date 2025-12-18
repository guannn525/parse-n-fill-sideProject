---
description: Evidence-based code review with low false positives
---

Review this implementation systematically. For each category, ONLY report issues you can prove with evidence.

## CATEGORIES

**1. CORRECTNESS** (Highest Priority)

- [ ] TypeScript compiles without errors
- [ ] Tests pass (or explain what test is needed)
- [ ] No runtime errors in common paths
- [ ] Handles actual data correctly (not hypothetical edge cases)

Evidence: Show the error, failing test, or reproduction steps.

**2. PROJECT STANDARDS**

- [ ] File location matches ARCHITECTURE.md decision tree
- [ ] Naming follows project conventions (check similar files)
- [ ] Uses existing patterns (don't reinvent what exists)
- [ ] Uses approved libraries (shadcn/ui, lucide-react only - not alternatives)

Evidence: Cite specific doc section or show inconsistency with existing code.

**3. SECURITY** (Actual Vulnerabilities)

- [ ] User input is validated at boundaries (not internal functions)
- [ ] Auth checks prevent unauthorized access
- [ ] No SQL injection, XSS, or CSRF in actual attack vectors

Evidence: Show the exploit payload or attack scenario.
Ignore: Theoretical hardening where attack is impossible.

**4. ACCESSIBILITY** (WCAG 2.1 AA - Non-negotiable per UI_DESIGN.md)

- [ ] Keyboard navigation works (test with Tab)
- [ ] Color contrast meets ratios (4.5:1 text, 3:1 UI)
- [ ] Icon-only buttons have aria-label
- [ ] Semantic HTML used (Button not div onClick)

Evidence: Show which interactive element fails which WCAG criterion.
Ignore: WCAG AAA nice-to-haves not in project standards.

**5. PERFORMANCE** (User-Impacting Only)

- [ ] No expensive operations in render loops
- [ ] No unnecessary re-renders (check with React DevTools)
- [ ] No blocking operations on user interaction

Evidence: Show profiler data or obvious O(n²) on large datasets.
Ignore: Micro-optimizations, theoretical improvements.

**6. MAINTAINABILITY**

- [ ] Complex logic has explanatory comments (not obvious statements)
- [ ] Functions do one thing
- [ ] No copy-paste that should be abstracted (3+ instances)

Evidence: Point to confusing code or repeated blocks.
Ignore: Preemptive abstractions, excessive documentation.

## REPORTING RULES

**Severity Levels:**

- **BLOCKING**: Prevents deployment (TS errors, failing tests, security exploits, WCAG violations)
- **IMPORTANT**: Degrades UX or violates project standards
- **MINOR**: Improvements that don't affect users

**Report Format:**

```
[SEVERITY] Category: Brief description
- File: path/to/file.ts:line
- Evidence: [Error message / doc citation / reproduction steps / existing pattern reference]
- Fix: Specific change needed
```

**DO NOT REPORT:**

- "Could/might/potentially" issues without proof
- Issues already handled elsewhere in the codebase
- Style preferences not documented in project standards
- Suggestions for "future flexibility" or premature optimization
- Improvements that contradict existing patterns

**CONTEXT CHECK:**
Before reporting an inconsistency, search the codebase to see if this pattern is already used elsewhere. If it matches existing code, it's probably intentional - don't flag it.

## USAGE EXAMPLES

Run automated checks first:

```bash
npm run typecheck && npm run lint && npm test
```

Then invoke this review for:

- High-stakes changes (auth, payments, data operations)
- UI components (accessibility compliance)
- API routes (security review)
- Architecture changes (standards compliance)

Skip for:

- Trivial fixes
- Internal refactors
- Config changes
- When automated checks already passed and change is low-risk
