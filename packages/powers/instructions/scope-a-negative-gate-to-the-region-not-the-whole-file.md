---
instruction_id: scope-a-negative-gate-to-the-region-not-the-whole-file
title: "Scope a negative gate to the region, not the whole file"
summary: A file-wide negative gate that a sibling region legitimately needs is unsatisfiable; scope the gate to the region instead.
capability_tags:
  - review-code
pattern_tags:
  - specification-gate
conditions_applies_when: A negative gate forbids a construct that another region of the same file legitimately contains.
conditions_does_not_apply_when: The construct is genuinely absent from the whole file.
artifact_contract_output_type: scoped-negative-gate
artifact_contract_required_data:
  - the region the gate covers
  - the construct that is banned there
  - the sibling region that needs it
artifact_contract_verified_by: the gate names a region and both regions pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Scope a negative gate to the region, not the whole file
A **negative grep** — `! grep -Eq 'PAT' file` or `grep -c 'PAT' file == 0` — asserts a construct is absent. `grep` is file-scoped by nature: it has no notion of function or region
A file-wide negative grep cannot say "absent in function X, present in function Y", so the two gates are mutually unsatisfiable with a direct call — the executor is pushed into an indirection whose only purpose is to relocate the matched string out of the file (pure gate-appeasement, zero behaviour change)
**The fix:** region-scope the negative gate so "absent in region X" stops implying "absent file-wide."
