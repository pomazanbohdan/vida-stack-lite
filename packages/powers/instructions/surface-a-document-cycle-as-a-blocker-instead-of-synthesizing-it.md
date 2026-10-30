---
instruction_id: surface-a-document-cycle-as-a-blocker-instead-of-synthesizing-it
title: Surface a document cycle as a blocker instead of synthesizing it
summary: A reference cycle is detected before the synthesis runs; the cyclic set is not synthesized and the rest still is.
capability_tags:
  - triage-reports
pattern_tags:
  - stop-on-conflict
conditions_applies_when: The documents reference each other in a cycle.
conditions_does_not_apply_when: The reference graph is acyclic.
artifact_contract_output_type: conflict-report
artifact_contract_required_data:
  - the cycle
  - the documents outside it
artifact_contract_verified_by: the cycle is reported and the cyclic set was not synthesized
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-synthesizer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-synthesizer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Surface a document cycle as a blocker instead of synthesizing it
Build a directed graph from `cross_refs`. Run cycle detection (DFS with three-color marking).
Do NOT proceed with synthesis on the cyclic set — synthesis loops produce garbage
Docs outside the cycle may still be synthesized
Skip cycle detection — synthesis loops produce garbage output
