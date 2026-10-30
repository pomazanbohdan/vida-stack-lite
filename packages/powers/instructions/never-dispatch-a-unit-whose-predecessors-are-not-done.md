---
instruction_id: never-dispatch-a-unit-whose-predecessors-are-not-done
title: Never dispatch a unit whose predecessors are not done
summary: "Readiness is transitive: a unit whose direct dependencies have no completion evidence is named, skipped and reported — it is never dispatched, not even when a later wave is ready."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - dependency-readiness
conditions_applies_when: Units of a phase are selected for execution and some of them declare dependencies.
conditions_does_not_apply_when: Every declared dependency of the selected unit is complete.
artifact_contract_output_type: readiness-report
artifact_contract_required_data:
  - the units selected
  - the units skipped
  - their missing predecessors
artifact_contract_verified_by: no unit with an incomplete dependency was dispatched and every skipped unit was named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/ready-wave-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never dispatch a unit whose predecessors are not done
Readiness is transitive: a ready plan's own dependencies are already complete, so **a not-ready plan must never be dispatched in this run, even when a later wave's plans are ready**.
This ordering is fail-closed: a later wave is never selected while any predecessor is incomplete, because a ready plan's own dependencies are complete by construction — anything not ready is reported and the run stops at the waiting condition.
