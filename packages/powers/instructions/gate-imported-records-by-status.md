---
instruction_id: gate-imported-records-by-status
title: Gate imported records by status
summary: "An imported decision that was superseded, rejected or deprecated is refused; one that is only proposed is flagged."
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: Decisions are imported from another document.
conditions_does_not_apply_when: The records carry no status.
artifact_contract_output_type: import-status-gate
artifact_contract_required_data:
  - the status of each record
  - "the decision to accept, warn or refuse it"
artifact_contract_verified_by: "a superseded, rejected or deprecated record never entered the context"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/adr-ingest-express-path.md
status: active
revision: 1
---

# Gate imported records by status
Status gate: reject `superseded`/`rejected`/`deprecated`; warn on `proposed`; missing status defaults to `accepted`.
