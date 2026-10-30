---
instruction_id: name-the-concerns-the-product-actually-carries
title: Name the concerns the product actually carries
summary: Read the material for the real concerns of this product and let them decide which sections the document needs.
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: The sources have been read and the sections of the document are being chosen.
conditions_does_not_apply_when: The sections of the document are already fixed.
artifact_contract_output_type: concern-list
artifact_contract_required_data:
  - the concerns that were named
  - the section each concern pulled in or invented
artifact_contract_verified_by: every concern either pulled in a section or was named as a section of its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
  - business
  - operations
---

# Name the concerns the product actually carries
Concern scan. As you read what the user gave you, name the concerns this product actually carries — compliance, integration density, operational SLAs, hardware constraints, public-API contracts, monetization, data governance, whatever applies.
The list is open; recognize what's there, do not classify into a fixed shape.
These concerns drive which template sections to pull in from the Adapt-In Menu and which to invent when no cluster names them.
