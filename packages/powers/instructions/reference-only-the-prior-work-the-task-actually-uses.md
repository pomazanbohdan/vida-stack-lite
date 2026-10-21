---
instruction_id: reference-only-the-prior-work-the-task-actually-uses
title: Reference only the prior work the task actually uses
summary: "A plan references a prior summary only when it genuinely uses that plan's types, exports or decisions."
capability_tags:
  - plan-implementation
pattern_tags:
  - progressive-disclosure
conditions_applies_when: The context section of a plan lists prior artifacts.
conditions_does_not_apply_when: The plan is the first in the phase.
artifact_contract_output_type: context-selection
artifact_contract_required_data:
  - the referenced prior artifacts
  - what each one is used for
artifact_contract_verified_by: every referenced prior artifact is used by the plan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 1
---

# Reference only the prior work the task actually uses
**Why bad:** Plans are often independent. Reflexive chaining (02 refs 01, 03 refs 02...) wastes context. Only reference prior SUMMARY files when the plan genuinely uses types/exports from that prior plan or a decision from it affects the current plan
