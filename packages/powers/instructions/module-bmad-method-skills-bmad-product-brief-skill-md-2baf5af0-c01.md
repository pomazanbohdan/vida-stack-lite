---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-product-brief-skill-md-2baf5af0-c01"
title: "bmad-method: skills/bmad-product-brief/SKILL.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-product-brief/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-product-brief/SKILL.md\"}"
atom_ids:
  - do-not-fabricate-the-differentiation
  - offer-a-new-document-when-the-change-is-fundamental
atom_count: 2
atoms: "[{\"atom_id\":\"do-not-fabricate-the-differentiation\",\"file_sha256\":\"626870f27fbe1c15ca770b5f52f94a205a85b0accfbf64a4c06f7bf36eb2efe2\",\"content_sha256\":\"b30e4f11e18ea4081b716a1e53d4ab5ab245cbd2fa83f1eaf06eceb3e45e6868\",\"file_bytes\":1625,\"body_bytes\":454},{\"atom_id\":\"offer-a-new-document-when-the-change-is-fundamental\",\"file_sha256\":\"613b71773336e1bd622862925444e31183ec3f7e1b4227624181d77b785c3575\",\"content_sha256\":\"9ea388a1fcc3040bb6c38b2b20ec25b1e9b702f1c3a677fee62bc202ad9d626b\",\"file_bytes\":1394,\"body_bytes\":278}]"
carrier_sha256: 881596fe56203b5ee28d307f0f12c9ecdeabbd2db1cf9b6841f0cf66e27a6f89
carrier_bytes: 3308
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-fabricate-the-differentiation -->
---
instruction_id: do-not-fabricate-the-differentiation
title: Do not fabricate the differentiation
summary: "State the real advantage, including when it is only execution speed, and never invent a technical moat."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: A document states what makes the product different.
conditions_does_not_apply_when: The document makes no differentiation claim.
artifact_contract_output_type: differentiation-section
artifact_contract_required_data:
  - the differentiators
  - the honest reason for each
artifact_contract_verified_by: no moat is claimed that the product does not have
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/assets/brief-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - business
---

# Do not fabricate the differentiation
Briefs produced here are honest, right-sized to purpose, and built for what comes next — they do not pad, they do not fabricate moats, they surface what is unknown alongside what is known - the user must feel that it is their own creation.
Key differentiators. Why this approach over alternatives, what is the unfair advantage. Be honest. If the moat is execution speed, say so. Do not fabricate technical moats.
<!-- vpmodule:atom:end do-not-fabricate-the-differentiation -->
<!-- vpmodule:atom:begin offer-a-new-document-when-the-change-is-fundamental -->
---
instruction_id: offer-a-new-document-when-the-change-is-fundamental
title: Offer a new document when the change is fundamental
summary: "A patch applied without context drifts; when the change is fundamental, offer to write a new document instead of patching the old one."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An existing document has to change and the change may be fundamental.
conditions_does_not_apply_when: "The change is a small, local edit."
artifact_contract_output_type: change-decision
artifact_contract_required_data:
  - the change signal
  - the decision to patch or to write anew
artifact_contract_verified_by: a fundamental change was offered as a new document instead of a patch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Offer a new document when the change is fundamental
Reconcile an existing brief with a change signal.
A patch applied without context becomes drift
If the change is fundamental, offer
a new document instead of patching.
Surface conflicts with prior decisions before changing.
<!-- vpmodule:atom:end offer-a-new-document-when-the-change-is-fundamental -->