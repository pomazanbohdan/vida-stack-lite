---
instruction_id: shape-the-document-to-the-product-not-the-template
title: "Shape the document to the product, not the template"
summary: "Start from the default spine, add the clusters the product’s concerns need, invent a section when none names the concern, and drop a section only for a reason a reviewer would accept."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: The sections of a requirements document are being chosen.
conditions_does_not_apply_when: Another instruction already fixes the sections of this document.
artifact_contract_output_type: document-shape
artifact_contract_required_data:
  - the sections kept
  - the sections dropped and the reason
  - the sections invented
artifact_contract_verified_by: no section is present because the template has it and no concern is left uncovered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/assets/brief-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - design-ux
---

# Shape the document to the product, not the template
Cross-cutting NFRs in their own section; skip traceability matrices.
Treat the
template as expert prior knowledge, not a checklist.
The Essential Spine is the expected default — present it unless the product genuinely doesn't need a section, and when you drop one, do so for a reason a reviewer would agree with.
The Adapt-In Menu is conditional: pull in the clusters the product's concerns need to best define the requirements.
When the product carries a concern the menu doesn't name, invent the section — name it well, decide what belongs in it, place it where it serves the reader or the PRD.
Reorder and combine for readability.
Never include a section because it appears; never skip a concern because no template section covered it.
Treat the
brief template
as a starting structure, not a contract: drop sections that do not earn their place, add sections the product needs, reorder freely - create sections for specialized domains or concerns also as needed.
The brief serves the product's story, not the template's shape.
Adapt aggressively to the product, the purpose, and the domain. Drop sections that do not earn their place, add sections the product needs, reorder freely.
If UX work or other inputs already exist, name them here and reference where they live — this PRD builds on them, it does not duplicate.
