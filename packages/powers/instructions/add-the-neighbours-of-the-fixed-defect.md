---
instruction_id: add-the-neighbours-of-the-fixed-defect
title: Add the neighbours of the fixed defect
summary: "Cases are generated around the equivalence class the fix draws, so the adjacent off-by-one is caught as well."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A defect was fixed and the regression test is being written.
conditions_does_not_apply_when: "The defect had no equivalence class, only an open end."
artifact_contract_output_type: boundary-neighbour-cases
artifact_contract_required_data:
  - the equivalence class the fix draws
  - the neighbour cases
  - the boundary they sit at
artifact_contract_verified_by: the cases sit just outside the fixed class and the seed alone is not the whole check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-repro-hardening.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Add the neighbours of the fixed defect
After the fix, generate boundary-adjacent cases **around the fixed defect's equivalence class** — the single reported value misses the adjacent off-by-one:
Off-by-one — `N-1`, `N`, `N+1` around the boundary the fix touched.
Min/max — `0`, `length`, empty range, the max representable value.
Empty / singleton — `[]`, `[x]`, `""`, `"c"`.
First identify the equivalence class the fix's predicate draws
the neighbors are the elements just outside that class boundary.
They catch the adjacent off-by-one that a single-value regression seed misses.
