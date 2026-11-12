---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-research-project-features-md-2f86bdb1-c01"
title: "gsd-core: gsd-core/templates/research-project/FEATURES.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/templates/research-project/FEATURES.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/research-project/FEATURES.md\"}"
atom_ids:
  - cut-the-mvp-to-what-is-truly-minimum
  - record-the-features-that-seem-good-but-are-not
  - separate-table-stakes-from-differentiators
atom_count: 3
atoms: "[{\"atom_id\":\"cut-the-mvp-to-what-is-truly-minimum\",\"file_sha256\":\"8af334f020d55e58d307d204c752755eed7a10818b265ec570b43171d2b9e23e\",\"content_sha256\":\"6adae2a24d87fda0890176f912e8eacdacc5845f616423b7e84d703d145bda44\",\"file_bytes\":1208,\"body_bytes\":144},{\"atom_id\":\"record-the-features-that-seem-good-but-are-not\",\"file_sha256\":\"f1c4b1ee832371f0d596a28e10605bbf8f3af47a7b22e43ed87636412dc80e2c\",\"content_sha256\":\"4bab9358e51e513d8101248a65d4a3a1a712d4786b691533f27fc4a777ba5d21\",\"file_bytes\":1242,\"body_bytes\":188},{\"atom_id\":\"separate-table-stakes-from-differentiators\",\"file_sha256\":\"c5f8cc0f44512d3a8e018c955c41b6ff8697d782e053102a8fc9988b430c551a\",\"content_sha256\":\"a1f9f3f30bfad5505501853f385a29fb17842e81b06a50fffe75082ff1910321\",\"file_bytes\":1374,\"body_bytes\":308}]"
carrier_sha256: 893bf733f40a666a31f1a5b7f415e8ab0c8f44e2781c58cd1ab759c578e10189
carrier_bytes: 4245
revision: 1
status: active
---
<!-- vpmodule:atom:begin cut-the-mvp-to-what-is-truly-minimum -->
---
instruction_id: cut-the-mvp-to-what-is-truly-minimum
title: Cut the MVP to what is truly minimum
summary: A nice-to-have is not part of the first version; the first version is launched small and expanded after it is validated.
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The first release of a product is being scoped.
conditions_does_not_apply_when: The first release is already scoped and agreed.
artifact_contract_output_type: mvp-scope
artifact_contract_required_data:
  - what the first release contains
  - what is deferred until after validation
artifact_contract_verified_by: the first release holds only what is truly minimum and the rest is deferred
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/FEATURES.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
---

# Cut the MVP to what is truly minimum
Be ruthless about what's truly minimum
"Nice to have" is not MVP
Launch with less, validate, then expand
<!-- vpmodule:atom:end cut-the-mvp-to-what-is-truly-minimum -->
<!-- vpmodule:atom:begin record-the-features-that-seem-good-but-are-not -->
---
instruction_id: record-the-features-that-seem-good-but-are-not
title: Record the features that seem good but are not
summary: A feature that looks attractive but creates problems is documented with the problem and the alternative.
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The feature landscape of a domain is written.
conditions_does_not_apply_when: No attractive but problematic feature was found.
artifact_contract_output_type: anti-feature-list
artifact_contract_required_data:
  - the feature
  - the problem it creates
  - the alternative to use
artifact_contract_verified_by: each such feature is listed with its problem and the alternative
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/FEATURES.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
---

# Record the features that seem good but are not
Features that seem good but create problems.
Prevent scope creep by documenting what seems good but isn't
Include the alternative approach
<!-- vpmodule:atom:end record-the-features-that-seem-good-but-are-not -->
<!-- vpmodule:atom:begin separate-table-stakes-from-differentiators -->
---
instruction_id: separate-table-stakes-from-differentiators
title: Separate the table stakes from the differentiators
summary: The features every user assumes exist are separated from the ones that set the product apart.
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: The feature landscape of a domain is written.
conditions_does_not_apply_when: The product has no feature landscape.
artifact_contract_output_type: feature-landscape
artifact_contract_required_data:
  - the table stakes with the expectation behind each
  - the differentiators
artifact_contract_verified_by: the two groups are listed separately and each feature is in one of them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/FEATURES.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Separate the table stakes from the differentiators
Features users assume exist. Missing these = product feels incomplete.
Users don't give credit for having them, but penalize for missing them
These are non-negotiable for launch
These are where you compete
Should align with the Core Value from PROJECT.md
<!-- vpmodule:atom:end separate-table-stakes-from-differentiators -->