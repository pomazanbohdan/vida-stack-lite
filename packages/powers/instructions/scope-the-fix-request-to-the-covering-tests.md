---
instruction_id: scope-the-fix-request-to-the-covering-tests
title: Scope the fix request to the covering tests
summary: The fix request names the smallest change that does the job and asks for the tests that cover the edited files only; the full verification stays with the caller.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A finding is sent back to the executor that produced the change.
conditions_does_not_apply_when: The fix is applied in the current session.
artifact_contract_output_type: fix-request
artifact_contract_required_data:
  - the finding
  - the smallest fix
  - the tests to run
artifact_contract_verified_by: the request names the covering tests and leaves the full verification to the caller
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Scope the fix request to the covering tests
Auto-fix. These are the only findings that survive loopbacks.
Fix each one below with the smallest change that does the job.
Run only the tests that cover the files you edit — nothing wider. Full verification runs on my side after you return. Reply with what you changed.
If verification fails and the failure cannot be fixed, HALT with status `blocked` and blocking condition `patch verification failed`.
