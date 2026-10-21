---
instruction_id: never-auto-apply-a-destructive-or-unrecognised-change
title: Never auto-apply a destructive or unrecognised change
summary: "A repair that carries destructive risk and a record whose shape is not recognised are reported, never applied."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: "A tool may repair, reset or clean up a record it did not create."
conditions_does_not_apply_when: The change is recoverable and its shape is recognised.
artifact_contract_output_type: repair-report
artifact_contract_required_data:
  - the issue that was found
  - the risk that made it destructive
  - the reason it was not applied
artifact_contract_verified_by: the destructive or unrecognised issue is reported and nothing was applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/health-validation.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/archive-quick-tasks-at-milestone-close.md
status: active
revision: 1
---

# Never auto-apply a destructive or unrecognised change
`--repair` flag MUST auto-fix recoverable issues except DESTRUCTIVE-risk ones, which it MUST report but never auto-apply
System MUST detect orphaned plans without summaries
System MUST check phase numbering and roadmap sync
is left untouched with a warning rather than reset, since clearing it would risk destroying rows under a schema
