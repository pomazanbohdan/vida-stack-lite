---
instruction_id: do-not-read-a-skipped-probe-as-a-negative-verdict
title: Do not read a skipped probe as a negative verdict
summary: A probe that could not examine its input reports that it did not run; that report is never read as the opposite verdict.
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A machine probe returned a result and its status is being interpreted.
conditions_does_not_apply_when: The probe ran and returned a real verdict.
artifact_contract_output_type: probe-verdict
artifact_contract_required_data:
  - the probe status
  - the verdict field
  - what the payload did not contain
artifact_contract_verified_by: a skipped status was checked before the verdict was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/ai-integration/fragments/api-coverage-plan-pre.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/assumption-delta/fragments/plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Do not read a skipped probe as a negative verdict
- **Check for `skipped` before reading `detected`**: a `skipped` payload is not a confirmed "no API integration" verdict, it means the detector never examined real input.
- Do not treat it as `detected:false`.
- Skip the checkpoint for this run rather than asserting a verdict about input that was never examined; do not raise it with the user.
