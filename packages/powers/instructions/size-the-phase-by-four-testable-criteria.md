---
instruction_id: size-the-phase-by-four-testable-criteria
title: Size the phase by four testable criteria
summary: "A unit of work is accepted as the right size only when its goal is one sentence, its research is bounded, its execution splits into a handful of independent plans, and its done-state is checkable without reading the whole codebase."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A unit of work is being sized before it is planned.
conditions_does_not_apply_when: The unit of work is already agreed and recorded.
artifact_contract_output_type: scope-criteria
artifact_contract_required_data:
  - the one-sentence goal
  - the bounded research
  - the number of independent plans
  - the testable done-state
artifact_contract_verified_by: "all four criteria hold, or the unit of work was split"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/the-phase-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
  - research
---

# Size the phase by four testable criteria
- The goal can be stated in a single sentence that is neither obviously trivial nor suspiciously broad.
- The research needed to plan it is bounded — the ecosystem questions have answers that do not depend on other phases completing first.
- The execution can be parallelised into a handful of non-overlapping plans, not dozens.
- There is a clear, testable definition of done that a verifier can check without reading the entire codebase.
