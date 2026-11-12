---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-prd-assets-prd-template-md-97c9978a-c01"
title: "bmad-method: skills/bmad-prd/assets/prd-template.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-prd/assets/prd-template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-prd/assets/prd-template.md\"}"
atom_ids:
  - anchor-the-vocabulary-in-the-glossary
  - give-every-requirement-a-testable-consequence
  - make-the-executive-summary-stand-alone
atom_count: 3
atoms: "[{\"atom_id\":\"anchor-the-vocabulary-in-the-glossary\",\"file_sha256\":\"18abe1d6e3b73c8932cff04b36d685c3f25de8401e4875dc1f10f5f288451baf\",\"content_sha256\":\"327235c15a4652272c1a07c696caaa2bdd41a38cfc45cfb01b611f1d22f8ea74\",\"file_bytes\":1858,\"body_bytes\":663},{\"atom_id\":\"give-every-requirement-a-testable-consequence\",\"file_sha256\":\"546ee761a092267748d75ada204ea8ffaf36814c1f7b4f2d8cfd3025c5ef32a2\",\"content_sha256\":\"3425c87bfe4b8652333d08c07f81dd688af612d5f83abfc0fa8bc54ea4464109\",\"file_bytes\":2620,\"body_bytes\":962},{\"atom_id\":\"make-the-executive-summary-stand-alone\",\"file_sha256\":\"551141f41eccefde67653fe8f5849e9708142fec7749a8293a9b4a4776912232\",\"content_sha256\":\"c01b834d9743d3e594f88e5eff83dc70accd1fb1807dcc0673e82cd0f7110e45\",\"file_bytes\":1614,\"body_bytes\":430}]"
carrier_sha256: d4ff4709236227da3ea356a4e2c6b51b050ab79af9e6bb5bcda3c7a8a52cd804
carrier_bytes: 6505
revision: 1
status: active
---
<!-- vpmodule:atom:begin anchor-the-vocabulary-in-the-glossary -->
---
instruction_id: anchor-the-vocabulary-in-the-glossary
title: Anchor the vocabulary in the glossary
summary: "Define every domain noun once in the glossary, use the terms verbatim everywhere else, and add a new noun in the same pass it appears."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: A requirements document has domain nouns in it.
conditions_does_not_apply_when: The document has no shared vocabulary to anchor.
artifact_contract_output_type: glossary-usage
artifact_contract_required_data:
  - the glossary terms
  - the synonyms that were refused
artifact_contract_verified_by: no synonym appears outside the glossary and every new noun was added in the pass it appeared
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/agents/domain.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Anchor the vocabulary in the glossary
Downstream workflows and readers must use these terms exactly.
FRs, UJs, and SMs use Glossary terms verbatim; introducing a synonym anywhere in the PRD is a discipline violation.
If §4 introduces a new domain noun, add it to the Glossary in the same pass.
Every domain noun the rest of the document uses. Defined once. No synonyms anywhere else in the PRD.
- When naming modules, writing issue titles, test descriptions, or commit messages — use terms as defined in `CONTEXT.md`. Don't drift to synonyms.
- If you need a concept that isn't in the glossary, note it for `/grill-with-docs` rather than inventing language.
<!-- vpmodule:atom:end anchor-the-vocabulary-in-the-glossary -->
<!-- vpmodule:atom:begin give-every-requirement-a-testable-consequence -->
---
instruction_id: give-every-requirement-a-testable-consequence
title: Give every requirement a testable consequence
summary: "Each requirement carries at least one verifiable consequence, and the non-functional sections state bounds instead of adjectives."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A requirements document is being written or reviewed.
conditions_does_not_apply_when: The document is a narrative that carries no requirements.
artifact_contract_output_type: testable-consequences
artifact_contract_required_data:
  - the consequence of each requirement
  - the adjectives that were replaced by bounds
artifact_contract_verified_by: every requirement names a verifiable condition and no bound is an adjective
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-validation-checklist.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/features/nyquist-validation.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Give every requirement a testable consequence
FRs with at least one testable consequence per FR — verifiable condition, measurable outcome.
"System handles X gracefully," "reasonable performance," "user-friendly" — flag every one.
For non-functional sections (UX, performance, security): bounds, not adjectives.
This is the dimension downstream story creation will lean on hardest. Be unforgiving here.

A good requirement is specific and testable, user-centric, atomic - one capability per requirement - and independent of the other requirements.
Reject the vague ones: "Handle authentication" becomes "User can log in with email and password and stay logged in across sessions".
Map automated test coverage to phase requirements before any code is written.
System MUST map each requirement to a specific test command
System MUST identify Wave 0 tasks (test scaffolding needed before implementation)
ensures a feedback signal exists for every requirement
<!-- vpmodule:atom:end give-every-requirement-a-testable-consequence -->
<!-- vpmodule:atom:begin make-the-executive-summary-stand-alone -->
---
instruction_id: make-the-executive-summary-stand-alone
title: Make the executive summary stand alone
summary: "The summary carries the whole vision in a few paragraphs, so a reader who reads only that section understands it."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A document opens with a summary that has to work on its own.
conditions_does_not_apply_when: The document has no summary.
artifact_contract_output_type: executive-summary
artifact_contract_required_data:
  - what this is
  - the problem it solves
  - why it matters
  - why now
artifact_contract_verified_by: a reader who reads only the summary understands the vision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-product-brief/assets/brief-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prd/assets/prd-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Make the executive summary stand alone
2-3 paragraph narrative: what this is, what problem it solves, why it matters, why now. Compelling enough to stand alone — if someone reads only this section, they should understand the vision.
2-3 paragraphs: what this is, what it does for the user, why it matters. Compelling enough to stand alone.
Where this goes if it succeeds. What it becomes in 2-3 years. Inspiring but grounded.
<!-- vpmodule:atom:end make-the-executive-summary-stand-alone -->