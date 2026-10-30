---
instruction_id: confine-the-reach-to-one-purpose-built-role
title: Confine the reach to one purpose-built role
summary: "A reach that is only needed by one job is given to a role built for that job, so the generalist keeps its narrow and auditable surface."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - control-tiering
conditions_applies_when: A role needs a reach that only one kind of work requires.
conditions_does_not_apply_when: The reach is needed by every kind of work.
artifact_contract_output_type: purpose-built-role
artifact_contract_required_data:
  - the role that gets the reach
  - the generalist that keeps its surface
  - the work the new role exists for
artifact_contract_verified_by: "the reach is confined to the purpose-built role and the generalist's surface is unchanged"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/live-dom-uat-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Confine the reach to one purpose-built role
- Browser reach is confined to one agent that only exists to look at a DOM.
- So widening the executor would trade a narrow, auditable surface for a permanent broad one, to solve a problem that a narrower surface also solves.
