---
instruction_id: write-few-meaningful-comments
title: Write few meaningful comments
summary: "Delete comments the code already tells you, keep the ones about constraints you cannot change, and encode those constraints in structure where possible."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: You add or review comments in code.
conditions_does_not_apply_when: The comment is a required element of an external format.
artifact_contract_output_type: commented-code
artifact_contract_required_data:
  - reason
  - scope of the pass
  - comments removed
  - check that each kept comment matches current code
artifact_contract_verified_by: each remaining comment checked against the current code
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/no-comments/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 2
---

# Write few meaningful comments
Use the caller's files or diff; otherwise use the current diff against the base branch, default main, including the working tree.
Inspect the report and the diff.
Reject application-code edits, scope escapes, exception-protected deletions, misstated kill reasons, and flags that treat kept intentional code as guilty.
Reshape flags on surprises in our own code stay actionable.
Do not restore those comments.
A keep survives only with proof it is about something we cannot change.
Audit missed scoped lint and type suppressions.
Correctness or safety suppressions stay actionable kills.
Restore deletions only with exact exceptions and scoped proof.
Before accepting thin "IMPORTANT" or "do not remove" kills or keeps, ask how or why the symbol is used.
If a kill is ambiguous, do not restore.
If a keep is refuted or still ambiguous, delete it.
Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API.
If any fix needs a shape, sketch it once for the accepted set and surrounding code; stop at the sketch.
Implement the smallest root-cause fix in scope.
Remove every named workaround.
If the root cause is out of scope, land the smallest in-scope fix and report the rest open.
Never bolt on symptom guards.
Constraint comments say "do not remove", "do not change wording", or "talk to X before changing".
Leave keeps about things we cannot change.
Offer the cheapest in-scope type, runtime, test, or CI lint; wait for approval.
If approved, encode the constraint then delete the comment.
Otherwise delete it, report the constraint open, and sketch out-of-scope work.
Report the deletion count, restored comments, reruns, sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.

Don't document obvious code. Don't add comments that restate what the code already says. Don't write docs for throwaway prototypes.

Comments on *why* are stable. Comments on *what* get outdated — that's why you only write the former.

### When NOT to Comment

```typescript
// Don't comment self-explanatory code
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Don't leave TODO comments for things you should just do now
// TODO: add error handling  ← Just add it

// Don't leave commented-out code
// const oldImplementation = () => { ... }  ← Delete it, git has history
```

### Document Known Gotchas

```typescript
/**
 * IMPORTANT: This function must be called before the first render.
 * If called after hydration, it causes a flash of unstyled content
 * because the theme context isn't available during SSR.
 *
 * See ADR-003 for the full design rationale.
 */
export function initializeTheme(theme: Theme): void {
  // ...
}
```
