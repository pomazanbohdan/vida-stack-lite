---
instruction_id: keep-the-provenance-in-the-record-not-in-a-body-section
title: "Keep the provenance in the record, not in a body section"
summary: The provenance of a document lives in the record that carries it; the body does not repeat it in a section of its own.
capability_tags:
  - define-output-format
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A document states where its content comes from.
conditions_does_not_apply_when: The document carries no sources at all.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the source entries in the record
  - the absence of a provenance section in the body
artifact_contract_verified_by: the sources are in the record and the body holds no provenance section of its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Keep the provenance in the record, not in a body section
Do **not** add a `# Citations` section; provenance now lives in the `sources` frontmatter (see below).
Provenance lives here, **not** in a `# Citations` body section.
Record provenance in the `sources` frontmatter list (each entry `{id, resource, title}`), never in a `# Citations` body section.
Include this concept’s own `resource` value as a `sources` entry (when present), followed by any URLs that informed the description.
