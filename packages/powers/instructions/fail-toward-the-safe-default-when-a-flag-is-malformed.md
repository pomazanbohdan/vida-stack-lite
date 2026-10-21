---
instruction_id: fail-toward-the-safe-default-when-a-flag-is-malformed
title: Fail toward the safe default when a flag is malformed
summary: A mistyped or unreadable switch value takes the conservative branch; the risky branch is never the fallback.
capability_tags:
  - parallelize-tasks
pattern_tags:
  - safe-defaults
conditions_applies_when: A switch that decides between a conservative and a risky branch is read.
conditions_does_not_apply_when: The switch was read and its value is canonical.
artifact_contract_output_type: switch-default
artifact_contract_required_data:
  - the value that was read
  - the branch that was taken
artifact_contract_verified_by: a malformed value took the conservative branch and a tool failure never took the risky one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md
status: active
revision: 1
---

# Fail toward the safe default when a flag is malformed
a mistyped or non-canonical value
gets the conservative behavior, and any tooling failure
fails safe to serial — never the opposite polarity, since firing concurrent
missing, malformed, string, numeric, or otherwise unrecognized values fail safe to
