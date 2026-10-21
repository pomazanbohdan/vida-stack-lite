---
instruction_id: report-a-non-terminal-marker-instead-of-a-fabricated-terminal-summary
title: Report a non-terminal marker instead of a fabricated terminal summary
summary: "When the run cannot finish, it says so with a non-terminal marker; it never dresses an unfinished run as a completed one."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The run ends while the underlying work is still in progress.
conditions_does_not_apply_when: The work reached a terminal state.
artifact_contract_output_type: run-status
artifact_contract_required_data:
  - the status
  - the next action
  - the reason
artifact_contract_verified_by: the marker is non-terminal and the reason names the unfinished work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debug-session-manager.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debug-session-manager.compact.md
status: active
revision: 1
---

# Report a non-terminal marker instead of a fabricated terminal summary
Do NOT fabricate a `DEBUG SESSION COMPLETE` or `ABANDONED` summary to fit this shape. Return the non-terminal marker instead:
Reason: session-manager turn/context budget exhausted — investigation still in progress
