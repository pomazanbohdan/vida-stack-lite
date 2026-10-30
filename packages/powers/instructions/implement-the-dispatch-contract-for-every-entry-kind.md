---
instruction_id: implement-the-dispatch-contract-for-every-entry-kind
title: Implement the dispatch contract for every entry kind
summary: "A dispatch implementation handles every entry the contract defines, not the one shape it happened to see; an empty list is skipped silently and an advisory entry never blocks."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A workflow consumes the registered extensions of an extension point.
conditions_does_not_apply_when: The point is evaluated once per task by its own dedicated mechanism.
artifact_contract_output_type: dispatch-implementation
artifact_contract_required_data:
  - the entry kinds the contract defines
  - the kinds the implementation dispatches
  - the behaviour for an empty list
artifact_contract_verified_by: every defined entry kind is dispatched and an empty list is skipped without output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Implement the dispatch contract for every entry kind
A point whose workflow hand-rolls one `kind` does not implement this contract. Several host workflows historically matched a single hook
so any other step registered there was declared and silently never run. When a workflow defers to this file, it dispatches **every** active `step` entry, not one shape of one.
A `step` is **advisory by construction**: it never blocks or redirects the host workflow - that is what a `gate` is for. Each dispatch is best-effort; on error record a warning and continue, honoring `onError`.
If `activeHooks` is absent, null, or an empty array, skip silently and continue to the next step in the workflow. No output to the user is needed.
