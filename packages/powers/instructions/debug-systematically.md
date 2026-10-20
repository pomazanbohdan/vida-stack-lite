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
status: active
revision: 5
---

# Debug systematically, do not guess

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
