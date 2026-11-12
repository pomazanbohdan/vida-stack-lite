---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-plan-choose-a-planning-path-md-bdcf2ef0-c01"
title: "bmad-method: docs/plan/choose-a-planning-path.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:docs/plan/choose-a-planning-path.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/plan/choose-a-planning-path.md\"}"
atom_ids:
  - pick-the-planning-tools-by-the-gap
  - re-slice-when-the-picture-changes
atom_count: 2
atoms: "[{\"atom_id\":\"pick-the-planning-tools-by-the-gap\",\"file_sha256\":\"2eb20ae956166ddec12e12c4c3d37d87566bb800fa8e13dc2b24cbcefbe49a9c\",\"content_sha256\":\"2dc78ef4f637987a52926504222ca9ec8719fa2f2ade8ea36c4b95d4affcfe0c\",\"file_bytes\":1630,\"body_bytes\":504},{\"atom_id\":\"re-slice-when-the-picture-changes\",\"file_sha256\":\"1f273daca819394f5e70310310712afc8be1d78267db24d086ba80e3bdaa055d\",\"content_sha256\":\"8621bb09ed02d3408699ba241323d8af4463562b6c1e25a6ae18f5e625b3eef6\",\"file_bytes\":2034,\"body_bytes\":619}]"
carrier_sha256: c9273ec6be8285ace0abcc3da2e8e4e10836e03e2eb542d19a01f325f6e435d1
carrier_bytes: 3913
revision: 1
status: active
---
<!-- vpmodule:atom:begin pick-the-planning-tools-by-the-gap -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/choose-a-planning-path.md
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
<!-- vpmodule:atom:end pick-the-planning-tools-by-the-gap -->
<!-- vpmodule:atom:begin re-slice-when-the-picture-changes -->
---
instruction_id: re-slice-when-the-picture-changes
title: Re-slice when the picture changes
summary: "When completed work changes the picture, revisit the whole remaining breakdown with the user, update the unstarted entries in place with their ids, and record the reason."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
conditions_applies_when: Completed work changed what the remaining work should look like.
conditions_does_not_apply_when: The remaining work is still correct as it was cut.
artifact_contract_output_type: revised-breakdown
artifact_contract_required_data:
  - the entries updated in place
  - the ids preserved
  - the reason recorded
artifact_contract_verified_by: the remaining entries are updated in place with their ids and the reason is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/choose-a-planning-path.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/plan-inside-an-organization.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-slice when the picture changes
When completed work changes the picture, revisit the whole remaining breakdown with the user. Update unstarted entries and tickets in place, preserving each `id`; published changes go through the store.
Run the set check on the revised draft before the user approves it, and record the reason in the epic's Notes.
The breakdown is an execution plan, not a promise that nothing will change.
Update the spec and re-slice the remaining stories when earlier work reveals a missing constraint, a better division, or a conflict between stories.
Keep historical plans and completed states.
<!-- vpmodule:atom:end re-slice-when-the-picture-changes -->