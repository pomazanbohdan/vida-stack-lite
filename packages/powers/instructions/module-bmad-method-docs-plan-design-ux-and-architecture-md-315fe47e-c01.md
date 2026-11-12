---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-plan-design-ux-and-architecture-md-315fe47e-c01"
title: "bmad-method: docs/plan/design-ux-and-architecture.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:docs/plan/design-ux-and-architecture.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/plan/design-ux-and-architecture.md\"}"
atom_ids:
  - elicit-the-design-vision-never-impose-it
  - record-only-the-decisions-two-builders-would-conflict-on
atom_count: 2
atoms: "[{\"atom_id\":\"elicit-the-design-vision-never-impose-it\",\"file_sha256\":\"4d4f9d457abd1a267cb265993403a4f631f27f06ec817efcf8606d34fe8aa8ce\",\"content_sha256\":\"f01f06fce7c9694edfb1091e117c3670844d5d2abc0a7ea16a429aa6e2aeffab\",\"file_bytes\":1954,\"body_bytes\":665},{\"atom_id\":\"record-only-the-decisions-two-builders-would-conflict-on\",\"file_sha256\":\"f097de5365a6e6a588236bc464ea6856f16d6e1cf93ce1ac25b422be8ee112e8\",\"content_sha256\":\"7b99f08103d8c77b656d9d079d3107c9c38e6a7e8471e6ffa776c1318a94646f\",\"file_bytes\":1709,\"body_bytes\":520}]"
carrier_sha256: 2495099e115c1e59794351e5cf840c69c2c32c5e4e01f5f1b31ee08770d77065
carrier_bytes: 3970
revision: 1
status: active
---
<!-- vpmodule:atom:begin elicit-the-design-vision-never-impose-it -->
---
instruction_id: elicit-the-design-vision-never-impose-it
title: "Elicit the design vision, never impose it"
summary: "Probe like a senior practitioner and capture the vision in the words of the person who owns it; never volunteer colours, patterns or directions unless a theme is already in place and they confirm it."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A design is being elicited from the person who owns the vision.
conditions_does_not_apply_when: The vision is already fixed and the work is to execute it.
artifact_contract_output_type: design-brief
artifact_contract_required_data:
  - the vision in the person own terms
  - the stakes
artifact_contract_verified_by: "no colour, pattern or direction was proposed that the person did not confirm"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/design-ux-and-architecture.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Elicit the design vision, never impose it
Elicit and capture the user's vision, never impose yours.
Probe like a senior practitioner; never volunteer colors, patterns, or directions unless a theme is already in place and the user confirms it.
Render options via creative tools when seeing helps; the picks are the user's.
Brain dump first — even when the user opens with paragraphs (that's intake).
One "anything else?" probe.
Stakes: hobby / internal / consumer / regulated.
Skip it for back-end work, internal tooling with no real interface, and changes to an existing UI that already has established patterns.
UX can lead the PRD, follow it, or stand alone.
<!-- vpmodule:atom:end elicit-the-design-vision-never-impose-it -->
<!-- vpmodule:atom:begin record-only-the-decisions-two-builders-would-conflict-on -->
---
instruction_id: record-only-the-decisions-two-builders-would-conflict-on
title: Record only the decisions two builders would conflict on
summary: "Write a shared decision only when two units built independently would choose incompatibly, the call is non-obvious, and it is a real trade-off."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Several units will be built separately and must stay compatible with each other.
conditions_does_not_apply_when: The work is one unit in one repository.
artifact_contract_output_type: shared-decision-record
artifact_contract_required_data:
  - the decision
  - the independent-builder test
  - the stable id
artifact_contract_verified_by: "the test answers yes, the call is non-obvious and a real trade-off, and the decision carries a stable id"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/design-ux-and-architecture.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Record only the decisions two builders would conflict on
One test decides what belongs.
If two units built this independently, could they choose incompatibly?
A decision goes in the spine only when the answer is yes, the call is non-obvious, and it is a real trade-off.
Everything else is left to the code.
Each decision gets a stable ID so specs and stories can cite it.
Deciding the API style "as we go", documenting every minor choice, and a spine written once and never updated are the three ways this step fails.
<!-- vpmodule:atom:end record-only-the-decisions-two-builders-would-conflict-on -->