---
instruction_id: classify-the-customization-intent
title: Classify the customization intent
summary: "The request is classified as directed, exploratory, audit/iterate or cross-cutting before a surface is chosen."
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A customization request arrives.
conditions_does_not_apply_when: The request already names both the target skill and the specific change.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the class of the request
artifact_contract_verified_by: the class of the request is named before any file is composed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Classify the customization intent
- **Directed** — specific skill + specific change
- **Exploratory** — "what can I customize?"
- **Audit/iterate** — wants to review or change something already customized
- **Cross-cutting** — could live on multiple surfaces
