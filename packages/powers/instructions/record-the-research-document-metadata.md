---
instruction_id: record-the-research-document-metadata
title: Record the research document metadata
summary: "A research document records its title, type, topic, source, status, validation, claims and dates in its metadata."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A research document is written or updated.
conditions_does_not_apply_when: The document is a scratch note that is not kept.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the title
  - the type
  - the topic
  - the source
  - the status
  - the validation
  - the claims
  - the dates
artifact_contract_verified_by: the metadata carries every field the document type declares
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/research.template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body lists research metadata fields but supplies no supported form beyond a record template.
---

# Record the research document metadata
title: '{research_type} research: {research_topic}'
type: '{research_type}'
topic: '{research_topic}'
source: '{source}'
status: draft
validation: '{validation}'
claims: {}
created: '{date}'
updated: '{date}'
