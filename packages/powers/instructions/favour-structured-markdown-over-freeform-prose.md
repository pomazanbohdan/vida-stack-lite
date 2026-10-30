---
instruction_id: favour-structured-markdown-over-freeform-prose
title: Favour structured markdown over freeform prose
summary: "The body of a document is written as structure — headings, lists, tables, fenced code — because structure serves both the human reader and the agent that retrieves it."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The body of a document is written.
conditions_does_not_apply_when: The document holds only a single sentence of prose.
artifact_contract_output_type: structured-body
artifact_contract_required_data:
  - the sections of the body
  - the structural elements used
artifact_contract_verified_by: the body uses structure rather than freeform prose
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - design-ux
---

# Favour structured markdown over freeform prose
The body is standard markdown.
Producers SHOULD favor structural markdown (headings, lists, tables, fenced code blocks) over freeform prose, since structure aids both human reading and agent retrieval.
There are no required body sections.
