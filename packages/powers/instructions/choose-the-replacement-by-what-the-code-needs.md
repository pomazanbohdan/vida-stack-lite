---
instruction_id: choose-the-replacement-by-what-the-code-needs
title: Choose the replacement by what the code needs
summary: "The replacement is picked by asking what the surrounding code actually needs, not by pattern-matching on the file."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A banned call has to be replaced.
conditions_does_not_apply_when: The call site is not yours to change.
artifact_contract_output_type: replacement-choice
artifact_contract_required_data:
  - what the surrounding code needs
  - the replacement that was chosen
artifact_contract_verified_by: the replacement follows from what the code needs and not from the file it sits in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-a-raw-terminator-finding.md
status: active
revision: 1
---

# Choose the replacement by what the code needs
Three outcomes exist. Pick by asking what the surrounding code actually needs, not by pattern-
matching on which file you happen to be in.
If the process should simply drain and exit non-zero once its event loop empties — no forced unwind, no immediate write-then-die — set `process.exitCode` and return normally:
