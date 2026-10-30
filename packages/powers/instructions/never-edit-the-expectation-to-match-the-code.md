---
instruction_id: never-edit-the-expectation-to-match-the-code
title: Never edit the expectation to match the code
summary: "When a test and the agreed behaviour disagree, the code changes; the expectation is never rewritten to match what the code does."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A test disagrees with the behaviour the plan agreed on.
conditions_does_not_apply_when: The behaviour itself was ambiguous and the row had to be settled.
artifact_contract_output_type: expectation-decision
artifact_contract_required_data:
  - the disagreement
  - what was changed
  - the ambiguity when there is one
artifact_contract_verified_by: "the code was brought to the expectation, not the expectation to the code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/test-completed-work.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/cross-platform-portability-rules.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never edit the expectation to match the code
If a test disagrees with the matrix, never edit the expectation to match the code: fix the code, or if the matrix row itself is ambiguous, HALT with status `blocked` and blocking condition `matrix ambiguity`.
If the audit cannot otherwise be satisfied, HALT with status `blocked` and blocking condition `matrix test audit failed`.
Run the new tests twice. A real bug is reported, and its test is kept as a known failure.
No test is loosened to make it pass.
- **Fix: normalize the ACTUAL operand to POSIX before comparing** — this is idempotent on POSIX (a no-op when there are no backslashes) and *reveals* a malformed return rather than masking it:
- Do **not** instead wrap the *expected* literal in `path.join(...)` to match the platform separator — that passes everywhere but masks a wrong backslash-on-POSIX return (both sides wrong together).
