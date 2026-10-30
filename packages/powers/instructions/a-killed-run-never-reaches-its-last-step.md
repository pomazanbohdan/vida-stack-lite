---
instruction_id: a-killed-run-never-reaches-its-last-step
title: A killed run never reaches its last step
summary: "A check that runs as the final step of a job reports nothing for a job that was killed before it, so its absence is explained by the kill and not by the condition being absent."
capability_tags:
  - instrument-production-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: A signal is missing from a run that may have been cut short.
conditions_does_not_apply_when: The run reached its end and the signal was still absent.
artifact_contract_output_type: absent-signal-reading
artifact_contract_required_data:
  - the missing signal
  - whether the run reached its last step
artifact_contract_verified_by: the absence is attributed to the kill and not read as a clean result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/read-ci-timeout-signals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# A killed run never reaches its last step
If the warning never appears even on a job that was actually cancelled at its cap, that is expected - a killed job never reaches its last step, so the in-job check never runs.
