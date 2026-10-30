---
instruction_id: augment-the-document-and-keep-every-heading
title: Augment the document and keep every heading
summary: "The document that is already on disk is the source of truth: every heading it has stays, in the same order and with the same wording, and the new material is added on top of it."
capability_tags:
  - write-technical-prose
pattern_tags:
  - expand-contract
conditions_applies_when: A document that already exists on disk is written again with new material.
conditions_does_not_apply_when: The document is written for the first time.
artifact_contract_output_type: documentation-update
artifact_contract_required_data:
  - the headings of the existing document
  - the headings of the new document
  - the content that was added
artifact_contract_verified_by: every heading of the existing document appears in the new document in the same order and with the same wording
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Augment the document and keep every heading
If it does, use it as a starting point and refine rather than rewrite.
Augmentation is strict (see "Augmentation rules" below) — you must preserve the existing structure verbatim and add content within or alongside it.
the call is an *augmentation*, not a rewrite.
Treat the existing doc as the source of truth and fold the web page into it.
Body — every `#` heading in the existing body must appear in your new body, in the same order, with the same wording.
You may:
- extend the prose under each heading,
- add new bullets to existing lists (e.g. add fields to `# Schema`, not replace the list),
- add new sub-sections (`##`) under existing top-level headings,
- add brand-new top-level headings **after** the existing ones,
You may not:
- drop or rename any existing `#` heading,
- replace the body wholesale with a topical rewrite of the web page,
If you cannot honor rule 2 because the web page is a fundamentally different topic (a query cookbook, a release notes page, a generic tutorial), do not call `write_concept_doc` for the existing concept.
Either mint a `references/<slug>` doc and cross-link from the primary doc’s prose, or skip the page.
