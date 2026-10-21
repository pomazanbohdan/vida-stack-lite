---
instruction_id: require-a-type-on-every-concept-document
title: Require a type on every concept document
summary: "Every document of a knowledge corpus carries a non-empty type that says what kind of concept it is; the type values are not registered centrally, so the type describes the concept rather than identifying it in a registry."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - output-formatting
conditions_applies_when: A document of a knowledge corpus is written or checked.
conditions_does_not_apply_when: "The document is an index or a log file, which carry no concept metadata."
artifact_contract_output_type: concept-document
artifact_contract_required_data:
  - the type of the document
  - the documents that carry no type
artifact_contract_verified_by: every document carries a non-empty type and every type value is descriptive
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Require a type on every concept document
Every frontmatter block contains a non-empty `type` field.
`type`: A short string identifying the kind of concept.
Consumers use it for routing, filtering, and presentation.
Type values are **not** registered centrally.
