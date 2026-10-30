---
instruction_id: find-the-pattern-divergence-from-the-surrounding-code
title: Find the pattern divergence from the surrounding code
summary: "The conventions of the surrounding codebase are the yardstick, and the divergence from them is found because it compounds over the sessions."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A body of work is read back against the codebase it lives in.
conditions_does_not_apply_when: The codebase has no established convention to diverge from.
artifact_contract_output_type: pattern-divergence
artifact_contract_required_data:
  - the convention
  - the places that diverge from it
artifact_contract_verified_by: every divergence names the convention it breaks and the place it occurs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Find the pattern divergence from the surrounding code
**Pattern divergence** — where the epic's code diverges from the conventions the surrounding codebase already established: naming, error handling, test structure, module boundaries.
Agents learn conventions by pattern-matching the code, so divergence compounds.
