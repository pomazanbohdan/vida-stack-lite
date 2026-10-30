---
instruction_id: gate-the-research-plan-on-one-approval
title: Gate the research plan on one approval
summary: "One hard stop presents the plan as a short checklist — the decision, the dimensions, the knobs, the surfaces, the estimate — and waits for approval before any acquisition."
capability_tags:
  - clarify-requirements
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A wide acquisition is about to start.
conditions_does_not_apply_when: The plan was already approved in this conversation.
artifact_contract_output_type: research-plan-gate
artifact_contract_required_data:
  - the checklist presented
  - the approval
  - the estimate given
artifact_contract_verified_by: no acquisition started before the checklist was approved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Gate the research plan on one approval
The one hard stop, kept light.
Present as a compact checklist, get approval, then:
- decision, type and pack-derived dimensions pruned to it
- shape
- knobs in force and where each came from
- which search surfaces exist
- an honest time estimate (a standard run is minutes; deep runs are tens of minutes and many times the tokens).
