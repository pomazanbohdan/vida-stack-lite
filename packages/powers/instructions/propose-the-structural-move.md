---
instruction_id: propose-the-structural-move
title: "Propose the structural move, not just the problem"
summary: "When a review flags a structural problem, name the restructuring that removes it instead of only complaining."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review finds a structural problem in the change under review.
conditions_does_not_apply_when: The finding is a plain defect with an obvious local fix.
artifact_contract_output_type: structural-remedy
artifact_contract_required_data:
  - the structural problem
  - the named restructuring
  - why that restructuring removes it
artifact_contract_verified_by: every structural finding names a restructuring instead of only naming a smell
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Propose the structural move, not just the problem

When you flag a structural problem, propose the move — not just the problem. A review that only says "this is complex" leaves the author guessing. Reach for a named restructuring:

- **Replace a chain of conditionals** with a typed model or an explicit dispatcher.
- **Collapse duplicate branches** into a single clearer flow.
- **Separate orchestration from business logic** so each reads on its own.
- **Move feature-specific logic** out of a shared module into the package that owns the concept.
- **Reuse the canonical helper** instead of a bespoke near-duplicate.
- **Make a type boundary explicit** so downstream branching disappears.
- **Delete a pass-through wrapper** that adds indirection without clarifying the API.
- **Extract a helper, or split a large file** into focused modules.

Prefer the remedy that removes moving pieces over one that spreads the same complexity around.
