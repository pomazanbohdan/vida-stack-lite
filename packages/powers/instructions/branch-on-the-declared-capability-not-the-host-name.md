---
instruction_id: branch-on-the-declared-capability-not-the-host-name
title: "Branch on the declared capability, not the host name"
summary: "A host is asked what it can do, not what it is called; a name test silently diverges as soon as another host declares the same capability."
capability_tags:
  - execute-plan
pattern_tags:
  - guidance-selection
conditions_applies_when: A run decides how to dispatch work based on what the host offers.
conditions_does_not_apply_when: The host offers exactly one way to do the work.
artifact_contract_output_type: capability-resolution
artifact_contract_required_data:
  - the declared capability
  - the branch that was taken
  - the degradation when it could not be resolved
artifact_contract_verified_by: the branch was taken on the declared capability and never on the host name
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/dispatch-isolation-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Branch on the declared capability, not the host name
Never branch a dispatch site on a runtime id.
Isolation is a negotiated capability declared per host; a runtime-name test silently diverges the moment a new host declares support
dispatching unisolated while reporting isolation is the one outcome worse than running sequentially
