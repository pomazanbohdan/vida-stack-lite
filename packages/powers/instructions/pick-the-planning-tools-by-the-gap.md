---
instruction_id: pick-the-planning-tools-by-the-gap
title: Pick the planning tools by the gap
summary: "Choose the planning tools the gap calls for, in any order, and condense what they produce before the next step."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The intent is not yet well defined and more than one planning tool could apply.
conditions_does_not_apply_when: The intent is already well defined and only needs to be turned into a contract.
artifact_contract_output_type: planning-path
artifact_contract_required_data:
  - the gap
  - the tools picked
  - the condensed result
artifact_contract_verified_by: each gap names the tool that closes it and the raw material was condensed before the next step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/choose-a-planning-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Pick the planning tools by the gap
These are independent tools, not stages. Pick the ones the gap calls for, in any order.
None of them build anything.
A short list of decisions is often enough on its own.
You need a PRD when more than one person must agree on what the product is, or more than one epic must not diverge; otherwise skip it.
The spec skill writes the contract; it does not help you figure out what you want.
If the spec says the input is too thin, you are not done on this chapter yet.
