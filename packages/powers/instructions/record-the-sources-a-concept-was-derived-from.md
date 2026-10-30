---
instruction_id: record-the-sources-a-concept-was-derived-from
title: Record the sources a concept was derived from
summary: "The material a concept derives from is recorded in a sources list: every entry names the resource it comes from, and every source the body cites carries a stable key."
capability_tags:
  - research-primary-sources
pattern_tags:
  - provenance-record
conditions_applies_when: A concept is written from material that exists outside the document.
conditions_does_not_apply_when: The concept states nothing that was derived from an outside material.
artifact_contract_output_type: source-list
artifact_contract_required_data:
  - the sources
  - the resource of each source
  - the key of each cited source
artifact_contract_verified_by: every source names its resource and every cited source carries a key
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Record the sources a concept was derived from
`sources` records the materials a concept derives from, external or internal to the bundle.
`resource`: REQUIRED within an entry.
Names either a concrete artifact a consumer can follow (an absolute URL, a bundle-relative path, or a path into a `references/` subdirectory) or a population or scope descriptor it cannot.
A stable key used to attribute individual claims (see below).
SHOULD be present when the body cites the source.
`title`: Optional. Human-readable label for the source.
Lineage is expressed through links, not a dedicated field.
