---
instruction_id: a-config-the-run-fails-closed-on-is-not-healthy
title: A config the run fails closed on is not healthy
summary: A configuration the execution path refuses to run with makes the state degraded even when the check itself found nothing wrong.
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: The check found a configuration that the execution path would refuse to run with.
conditions_does_not_apply_when: The configuration is one the run can work with.
artifact_contract_output_type: degraded-state-report
artifact_contract_required_data:
  - the configuration that fails closed
  - the warning that was added
  - the degraded status
artifact_contract_verified_by: the status is degraded and the warning is counted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/health.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# A config the run fails closed on is not healthy
a config the execution workflows fail closed on is not a healthy planning state
include it in the displayed warning count
It is not auto-repairable: an explicit `true` may be intentional
