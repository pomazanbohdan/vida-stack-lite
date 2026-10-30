---
instruction_id: record-the-deferred-scope-so-later-phases-do-not-re-litigate-it
title: Record the deferred scope so later phases do not re-litigate it
summary: The architectural record names the decisions later phases build on and the scope that was deliberately left out.
capability_tags:
  - plan-implementation
pattern_tags:
  - frozen-intent
conditions_applies_when: The first slice of a new project fixes its architecture.
conditions_does_not_apply_when: The project already has an established architecture.
artifact_contract_output_type: skeleton-record
artifact_contract_required_data:
  - the architectural decisions
  - the deferred scope
  - the capability proven end to end
artifact_contract_verified_by: the record names the decisions and the deferred scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/skeleton-template.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-mvp-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Record the deferred scope so later phases do not re-litigate it
Anything that is *not* in the skeleton. Be explicit — this list prevents future phases from re-litigating Phase 1's minimalism
records the architectural decisions that subsequent phases will build on (chosen framework, DB, deployment target, auth approach, directory layout)
is the architectural backbone for every later vertical slice; treat it as a contract, not a scratchpad
