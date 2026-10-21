---
instruction_id: detect-the-existing-tooling-before-you-default
title: Detect the existing tooling before you default
summary: What the project already uses is found first and kept; the opinionated default is only the fallback.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - project-conventions-first
conditions_applies_when: A tool has to be chosen for a task.
conditions_does_not_apply_when: The task names the tool.
artifact_contract_output_type: tooling-decision
artifact_contract_required_data:
  - the detected tooling
  - the choice
artifact_contract_verified_by: the existing tooling was checked and the choice follows from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-planner.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-planner.compact.md
status: active
revision: 1
---

# Detect the existing tooling before you default
Detect first — scan for existing tools before defaulting:
If detected: use it as the tracing default.
If nothing detected, apply opinionated defaults:
