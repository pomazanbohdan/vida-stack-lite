---
instruction_id: every-referenced-file-exists-and-opens
title: Every referenced file exists and opens
summary: "Every file and link an item names exists and opens, no placeholder is left unfilled, and every assumption is marked."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A work item or a set of them is checked.
conditions_does_not_apply_when: Nothing in the set points at a file or a link.
artifact_contract_output_type: reference-check
artifact_contract_required_data:
  - each reference
  - the result of opening it
  - the placeholders left unfilled
artifact_contract_verified_by: every referenced file and link was opened and no placeholder is left
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate-checks.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/set-and-maintain-project-context.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/planner-reachability-check.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Every referenced file exists and opens
Every file or link referenced exists and opens; no unfilled placeholder; every assumption is marked.
It checks every path a line names
and reads your `package.json`, `Makefile`, and CI config — not to copy the scripts, since an agent reads those directly, but to know what they already answer so the block adds only the right commands to use, the corrections, and the caveats.
Planner MUST validate that each plan step references reachable files and APIs
Unreachable steps MUST be flagged during planning, not discovered during execution
