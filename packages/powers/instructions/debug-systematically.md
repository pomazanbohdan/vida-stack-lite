---
instruction_id: debug-systematically
title: Find the root cause of the failure
summary: "Complete root-cause investigation before any fix: read the error, reproduce, trace the value upstream, then test one hypothesis at a time."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "A test, build, or running system behaves unexpectedly."
conditions_does_not_apply_when: No failure or deviation from expected behavior has been found.
artifact_contract_output_type: root-cause-report
artifact_contract_required_data:
  - reproduction steps
  - root-cause evidence
  - fix verification
artifact_contract_verified_by: a reproduction test fails before the fix and passes after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/root-cause-tracing.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-philosophy.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debugger.md
status: active
revision: 7
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Find the root cause of the failure

No fix before the root cause.

Core principle: understand the problem before proposing a fix; read the error, reproduce the failure, form one hypothesis at a time and test it.

1. Read the error and the code around it.
2. Reproduce the failure reliably.
3. Form one hypothesis and design the smallest test that would disprove it.
4. Compare the hypothesis with the evidence.
5. Implement the fix only after the root cause is confirmed.
6. Verify the fix against the original failing case.

If you cannot find the root cause, say so explicitly and continue investigating instead of guessing.

When the cause is environmental, timing-dependent or external: document what you investigated, implement the appropriate handling such as a retry, a timeout or an error message, and add monitoring or logging for a future investigation. But 95% of the "no root cause" cases are an incomplete investigation.

After a deep investigation, propose an always-on signal that would have caught the failure earlier, and add it.
Complete reading: Read entire functions, not just "relevant" lines. Read imports, config, tests. Skimming misses crucial details.
A good hypothesis can be proven wrong. If you can't design an experiment to disprove it, it's not useful.
The difference: Specificity. Good hypotheses make specific, testable claims.
One hypothesis at a time. If you change three things and it works, you don't know which one fixed it.
Understand the mechanism? Not just "what fails" but "why it fails"
Reproduce reliably? Either always reproduces, or you understand trigger conditions
Have evidence, not just theory? You've observed directly, not guessing
Ruled out alternatives? Evidence contradicts other hypotheses
Don't act if: "I think it might be X" or "Let me try changing Y and see"
