---
instruction_id: name-everything-you-tried-when-the-ladder-is-spent
title: Name everything you tried when the ladder is spent
summary: When the available tiers are exhausted the run says which ones were tried and never silently repeats the last one.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: The available alternatives are used up and the work still cannot run.
conditions_does_not_apply_when: The work succeeded on the first alternative.
artifact_contract_output_type: exhaustion-report
artifact_contract_required_data:
  - every alternative that was tried
  - the order
  - the manual options that remain
artifact_contract_verified_by: the report names every tried alternative and the last one is not repeated silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/execute-phase-quota-recovery.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Name everything you tried when the ladder is spent
A heavier tier on the same throttled provider is still throttled
the ladder is spent. Fail loudly naming every model tried, then fall through to the manual options below. Never silently retry the last one.
escalation is not configured for this project; use the manual path below. This is the default.
