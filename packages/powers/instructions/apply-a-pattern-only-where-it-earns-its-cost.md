---
instruction_id: apply-a-pattern-only-where-it-earns-its-cost
title: Apply a pattern only where it earns its cost
summary: "A pattern that is heavier than the work it serves is removed, and what removing it loses is said out loud."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
  - code-review
conditions_applies_when: A pattern is applied to a piece of work that does not need it.
conditions_does_not_apply_when: The pattern is the thing the user asked for.
artifact_contract_output_type: pattern-decision
artifact_contract_required_data:
  - the pattern
  - the work it was applied to
  - what removing it loses
artifact_contract_verified_by: the finding names what removing the pattern would cost
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-architecture.md
status: active
revision: 4
---

# Apply a pattern only where it earns its cost
A pattern over-applied (parallel reviewers on a one-file transform, a memory log on a one-shot, a menu on a one-job skill): Minor; say what removing it loses.
A multi-turn build with no state across turns: Minor
