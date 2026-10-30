---
instruction_id: implement-what-the-docs-show
title: Implement what the docs show
summary: "Use the signatures the documentation shows, avoid the deprecated patterns, and surface a conflict with the existing code instead of silently picking one."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: The documented patterns are known and the code is about to be written.
conditions_does_not_apply_when: The pattern is not covered by the documentation and is flagged as unverified instead.
artifact_contract_output_type: implementation-decision
artifact_contract_required_data:
  - the documented pattern used
  - the deprecated pattern avoided
  - the surfaced conflict
artifact_contract_verified_by: the code uses the signatures of the current documentation and no conflict was resolved silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/source-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Implement what the docs show

### Step 3: Implement Following Documented Patterns

Write code that matches what the documentation shows:

- Use the API signatures from the docs, not from memory
- If the docs show a new way to do something, use the new way
- If the docs deprecate a pattern, don't use the deprecated version
- If the docs don't cover something, flag it as unverified

**When docs conflict with existing project code:**

CONFLICT DETECTED:
The existing codebase uses useState for form loading state,
but React 19 docs recommend useActionState for this pattern.
(Source: react.dev/reference/react/useActionState)

Options:
A) Use the modern pattern (useActionState) — consistent with current docs
B) Match existing code (useState) — consistent with codebase
→ Which approach do you prefer?

Surface the conflict. Don't silently pick one.

## Red Flags

- Writing framework-specific code without checking the docs for that version
- Using deprecated APIs because they appear in training data
