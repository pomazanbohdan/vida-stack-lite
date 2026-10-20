---
instruction_id: keep-runbooks-current
title: Keep the runbook current
summary: Fix the runbook while closing the incident it was used in.
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: An incident is being closed and a runbook was used during it.
conditions_does_not_apply_when: No incident is being closed.
artifact_contract_output_type: runbook-update
artifact_contract_required_data:
  - the incident
  - the step that was wrong or missing
  - the correction
artifact_contract_verified_by: the runbook is corrected before the incident is marked resolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Keep the runbook current

**Keep runbooks current.**
Update the runbook as part of closing every incident it was used in — a stale runbook builds false confidence.
If a step was wrong or missing, fix it before marking the incident resolved.
