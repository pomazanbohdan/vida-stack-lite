---
instruction_id: name-the-symbols-the-phase-creates
title: Name the symbols the phase creates
summary: "The plan lists every symbol the phase introduces, so that a later check does not report a new symbol as missing."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan declares the symbols the phase will create.
conditions_does_not_apply_when: The phase creates no new symbols.
artifact_contract_output_type: produced-symbols
artifact_contract_required_data:
  - the symbols the phase creates
  - the kinds of symbol it names
artifact_contract_verified_by: every created symbol is listed and the list is used to exempt them from the drift check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Name the symbols the phase creates
List every symbol this phase creates: decorators, classes, functions, CLI flags, struct/dataclass fields, new file paths.
Do NOT verify symbols the plan declares under its "Artifacts this phase produces" section
those are created by this phase, not references to existing code.
omitting it causes new symbols to be flagged for acknowledgement.
