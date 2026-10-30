---
instruction_id: do-not-flag-a-deferred-or-out-of-scope-item-as-a-gap
title: Do not flag a deferred or out-of-scope item as a gap
summary: "An item the developer deferred, an item owned by another phase and an item the researcher marked out of scope are not gaps."
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: A source audit classifies an item as covered or missing.
conditions_does_not_apply_when: The item is in scope and no plan covers it.
artifact_contract_output_type: gap-classification
artifact_contract_required_data:
  - the item
  - the reason it is not a gap
artifact_contract_verified_by: "no deferred, out-of-scope or other-phase item is reported as missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-source-audit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not flag a deferred or out-of-scope item as a gap
Do not flag these as MISSING:
- Items in `## Deferred Ideas` in CONTEXT.md — developer chose to defer these
- Items scoped to a different phase via `phase_req_ids` — not assigned to this phase
- Items in RESEARCH.md explicitly marked "out of scope" or "future work" by the researcher
