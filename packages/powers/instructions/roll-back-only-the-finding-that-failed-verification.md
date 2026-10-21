---
instruction_id: roll-back-only-the-finding-that-failed-verification
title: Roll back only the finding that failed verification
summary: "The files a single finding touches are recorded before the edit, and a failed verification reverts exactly those files and nothing earlier."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A fix was applied and its verification failed.
conditions_does_not_apply_when: The fix passed verification and was committed.
artifact_contract_output_type: fix-record
artifact_contract_required_data:
  - the files touched
  - the rollback result
artifact_contract_verified_by: the failed change was reverted and the earlier findings were left untouched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.compact.md
status: active
revision: 1
---

# Roll back only the finding that failed verification
Record files to touch: Note each file path in `touched_files` before editing anything.
Re-read the file and confirm it matches pre-fix state.
Mark finding as "skipped: fix caused errors, rolled back".
Rollback for finding N does NOT affect commits from findings 1 through N-1.
