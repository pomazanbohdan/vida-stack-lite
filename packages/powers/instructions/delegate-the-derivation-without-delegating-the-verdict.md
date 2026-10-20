---
instruction_id: delegate-the-derivation-without-delegating-the-verdict
title: Delegate the derivation without delegating the verdict
summary: "A delegated view returns evidence and a checked scope, never a verdict; the parent consolidates and decides, and when delegation is impossible the highest-value views are computed inline and the narrowing is recorded."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
  - code-audit
conditions_applies_when: Several aggregate views are to be derived.
conditions_does_not_apply_when: Only one view is derived.
artifact_contract_output_type: delegated-derivation
artifact_contract_required_data:
  - the narrow view each delegate got
  - the evidence each returned
  - the views that were narrowed or skipped
artifact_contract_verified_by: "no delegate returned a verdict, and the views that were skipped or narrowed are recorded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 1
---

# Delegate the derivation without delegating the verdict
When sub-agents are available, delegate the derivation: each returns evidence with source refs and checked scope, never a verdict — the parent consolidates and decides.
Give each a narrow view and an explicit return format.
When sub-agents are unavailable, compute the highest-value views inline (architecture delta and spec reconciliation first) and record which views were narrowed or skipped.
