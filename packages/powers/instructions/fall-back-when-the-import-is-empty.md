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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/adr-ingest-express-path.md
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
