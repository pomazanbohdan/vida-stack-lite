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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/adr-ingest-express-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Gate imported records by status
Status gate: reject `superseded`/`rejected`/`deprecated`; warn on `proposed`; missing status defaults to `accepted`.
