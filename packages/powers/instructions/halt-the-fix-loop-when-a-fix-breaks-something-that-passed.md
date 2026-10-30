---
instruction_id: halt-the-fix-loop-when-a-fix-breaks-something-that-passed
title: Halt the fix loop when a fix breaks something that passed
summary: A repair round that makes a passing check fail stops the loop at once.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A repair round has finished and the results are being re-checked.
conditions_does_not_apply_when: No repair round has run yet.
artifact_contract_output_type: repair-report
artifact_contract_required_data:
  - the documents repaired
  - the regressions
  - the remaining failures
artifact_contract_verified_by: the loop stopped on the regression and the remaining failures are reported as needing manual review
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update/detail/elaboration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Halt the fix loop when a fix breaks something that passed
After each iteration's fix agents complete, re-verify ALL docs and check for regression
any doc that previously passed and now fails HALTS the loop immediately — remaining failures require manual review, no further fixes attempted.
at most 2 iterations
One agent spawn per doc with failures. Do not batch multiple docs into one spawn.
This means the fix introduced new errors. Remaining failures require manual review.
