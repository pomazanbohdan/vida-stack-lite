---
instruction_id: separate-implementation-context-from-planning-context
title: Separate implementation context from planning context
summary: "Keep the constraints, commands, conventions and pitfalls in the code repository, and the rationale, rejected approaches and ownership in the project."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: Context has to serve both coding sessions and planning work.
conditions_does_not_apply_when: Only one of the two kinds of work is in scope.
artifact_contract_output_type: context-split
artifact_contract_required_data:
  - the implementation context
  - the planning context
  - where each lives
artifact_contract_verified_by: each kind of context sits in the artifact that is checked against it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 1
---

# Separate implementation context from planning context
One artifact cannot serve both coding and planning work.
**Implementation context** — constraints, commands, conventions, pitfalls — belongs to a **code repository**: checkable against the code, stale on every commit, loaded on every session, so it must be tiny.
**Planning context** — rationale, rejected approaches, ownership, domain meaning, org standards — belongs to a **project or initiative**: traceable only to source documents, stale in months rather than hours, consulted in bursts rather than loaded continuously.
That is a different capability, and it is coming separately.
