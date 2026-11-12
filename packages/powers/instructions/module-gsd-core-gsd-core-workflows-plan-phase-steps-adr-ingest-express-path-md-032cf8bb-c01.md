---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-plan-phase-steps-adr-ingest-express-path-md-032cf8bb-c01"
title: "gsd-core: gsd-core/workflows/plan-phase/steps/adr-ingest-express-path.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/plan-phase/steps/adr-ingest-express-path.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/plan-phase/steps/adr-ingest-express-path.md\"}"
atom_ids:
  - fall-back-when-the-import-is-empty
  - gate-imported-records-by-status
atom_count: 2
atoms: "[{\"atom_id\":\"fall-back-when-the-import-is-empty\",\"file_sha256\":\"f0eb58202953dcc7b2749862e699d6d83171b3c7c38249ab6f0f8dde1762af26\",\"content_sha256\":\"6eb9b147500375dc88b45c23e781cb8c9ca80060f64a370a3fd1a922b8c1b714\",\"file_bytes\":1226,\"body_bytes\":113},{\"atom_id\":\"gate-imported-records-by-status\",\"file_sha256\":\"0e44dab9005d0beddbe82de5b3cd5fd2ef4ce0fd17ea5d5b807f65df56690f3d\",\"content_sha256\":\"6e4d4724bb430e9b054790573567a8cf8748698deac18b05dc844c7d25bfec1b\",\"file_bytes\":1202,\"body_bytes\":151}]"
carrier_sha256: 19f5d93b1d2619e4e92893ee0b4af81eba71cdfc9d37e854ed451f04d28ad272
carrier_bytes: 2673
revision: 1
status: active
---
<!-- vpmodule:atom:begin fall-back-when-the-import-is-empty -->
---
instruction_id: fall-back-when-the-import-is-empty
title: Fall back when the import is empty
summary: An import that yields no decisions at all is reported as empty and handed to the discussion step instead of producing an empty context.
capability_tags:
  - curate-context
pattern_tags:
  - empty-result-policy
conditions_applies_when: The records were imported and none of them carries a decision.
conditions_does_not_apply_when: At least one record carries a decision.
artifact_contract_output_type: empty-import-report
artifact_contract_required_data:
  - the empty result
  - the step the run hands over to
artifact_contract_verified_by: the empty import was reported and the run handed over instead of continuing with an empty context
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
  - engineering
---

# Fall back when the import is empty
if all parsed ADRs have zero `decisions[]`
fall back to the discussion step
<!-- vpmodule:atom:end fall-back-when-the-import-is-empty -->
<!-- vpmodule:atom:begin gate-imported-records-by-status -->
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
<!-- vpmodule:atom:end gate-imported-records-by-status -->