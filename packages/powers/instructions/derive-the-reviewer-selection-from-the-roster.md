---
instruction_id: derive-the-reviewer-selection-from-the-roster
title: Derive the reviewer selection from the roster
summary: The reviewer lineup is taken from the declared roster and the configured default; it is never hand-listed in the run.
capability_tags:
  - review-code
pattern_tags:
  - project-conventions-first
conditions_applies_when: The run has to choose which reviewers take part.
conditions_does_not_apply_when: The lineup was given explicitly on the command line.
artifact_contract_output_type: reviewer-selection
artifact_contract_required_data:
  - the roster the selection came from
  - the resolved lineup
artifact_contract_verified_by: the selection came from the declared roster and the configured default was not overridden
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 1
---

# Derive the reviewer selection from the roster
DERIVED from the declared lane roster
never hand-listed.
invocation respects the configured reviewer lineup
