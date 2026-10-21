---
instruction_id: untrack-what-the-ignore-rule-cannot-reach
title: Untrack what the ignore rule cannot reach
summary: An ignore rule stops new files from being picked up; the files already tracked are untracked explicitly or they keep being staged.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: Files that should stop being tracked are still tracked.
conditions_does_not_apply_when: The files were never tracked.
artifact_contract_output_type: untracking-record
artifact_contract_required_data:
  - the paths that were untracked
  - the check that shows they are no longer tracked
artifact_contract_verified_by: the paths are no longer tracked and the files remain on disk
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/keep-planning-docs-private.md
status: active
revision: 1
---

# Untrack what the ignore rule cannot reach
**.gitignore** only stops git picking up *new* files. It has no effect on files already committed — git keeps tracking those, so `git add -A` keeps staging them even though steps 1 and 2 are both done.
`--cached` removes the files from the index only — your files on disk are untouched.
