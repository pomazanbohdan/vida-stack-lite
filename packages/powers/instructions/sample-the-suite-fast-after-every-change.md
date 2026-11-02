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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/VALIDATION.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Sample the suite fast after every change
**After every task commit:** Run `{quick run command}`
**After every plan wave:** Run `{full suite command}`
**Max feedback latency:** {N} seconds
