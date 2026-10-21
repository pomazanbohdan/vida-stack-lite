---
instruction_id: move-only-the-platform-signal-not-the-house-idioms
title: "Move only the platform signal, not the house idioms"
summary: "The idioms that stay behind are not platform behaviour, so they do not move with the tests that need a real operating system."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - project-conventions-first
conditions_applies_when: Tests are moved out of a file because of a platform signal.
conditions_does_not_apply_when: No test in the file carries a platform signal.
artifact_contract_output_type: split-file-decision
artifact_contract_required_data:
  - the signal that moved the test
  - the idioms that stayed behind
artifact_contract_verified_by: the moved file carries the signal and the base keeps only the idioms
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/split-platform-sensitive-tests.md
status: active
revision: 1
---

# Move only the platform signal, not the house idioms
**Clear the house idioms left in the base.** These are not platform behavior, so they do not move:
Running the CLI or `git` through raw `child_process` — route it through `tests/helpers/process-seam.cjs` (`runNode`, `runGit`), keeping the helper's return shape for its callers.
A comment that only mentions a signal word — reword it without changing its meaning.
