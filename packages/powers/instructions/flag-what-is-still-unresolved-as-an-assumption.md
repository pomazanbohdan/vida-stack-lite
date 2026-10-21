---
instruction_id: flag-what-is-still-unresolved-as-an-assumption
title: Flag what is still unresolved as an assumption
summary: An unresolved row is written down and marked as an assumption the next step has to treat as such; it is never skipped silently.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A document is written while some of its rows are still open.
conditions_does_not_apply_when: Everything was resolved.
artifact_contract_output_type: flagged-assumptions
artifact_contract_required_data:
  - the unresolved rows
  - the assumption each one forces
artifact_contract_verified_by: every unresolved row is marked as an assumption in the written document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 1
---

# Flag what is still unresolved as an assumption
On "anyway": write SPEC.md with those rows marked `⚠ Edge unresolved — planner must treat as assumption`.
On "anyway": write SPEC.md with those rows marked `⚠ Prohibition unresolved — planner must treat as assumption`. This is a soft gate (write-anyway-with-flags), never a silent skip — the soft gate IS the control.
