---
instruction_id: sample-the-suite-fast-after-every-change
title: Sample the suite fast after every change
summary: "The quick run follows every task and the full suite follows every wave, so the feedback stays inside its budget."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A sampling rate for a piece of work is defined.
conditions_does_not_apply_when: The work has no automated checks.
artifact_contract_output_type: sampling-rate
artifact_contract_required_data:
  - the quick run command
  - the full suite command
  - the feedback budget
artifact_contract_verified_by: the sampling rate names both commands and the maximum feedback latency
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/VALIDATION.md
status: active
revision: 1
---

# Sample the suite fast after every change
**After every task commit:** Run `{quick run command}`
**After every plan wave:** Run `{full suite command}`
**Max feedback latency:** {N} seconds
