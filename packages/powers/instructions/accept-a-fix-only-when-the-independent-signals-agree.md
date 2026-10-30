---
instruction_id: accept-a-fix-only-when-the-independent-signals-agree
title: Accept a fix only when the independent signals agree
summary: Several partially independent signals must agree before a fix is accepted; one failing signal rejects it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A fix is about to be accepted.
conditions_does_not_apply_when: Nothing was changed and only the cause is reported.
artifact_contract_output_type: fix-acceptance-verdict
artifact_contract_required_data:
  - every signal and its result
  - the verdict
  - the signal that rejected the fix
artifact_contract_verified_by: all applicable signals passed or the acceptance is recorded as documented debt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-fix-acceptance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Accept a fix only when the independent signals agree
A fix is accepted only when **all applicable signals** agree.
Any one failing signal (that is not a justified technical-debt escape — see below) rejects the fix
Per **Goodhart's Law**, the defense is not a better single metric — it is several **partially-independent** signals that pull in different directions, plus separating the test that *drives* the fix from the check that *judges* it.
Target test greens — the regression test that reproduced the bug now passes
Adjacent / held-out tests green — the existing regression-testing step, made a hard gate.
Every degradation is **logged/recorded** in the debug file
a skipped signal is never silently passed
