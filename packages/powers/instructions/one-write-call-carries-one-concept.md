---
instruction_id: one-write-call-carries-one-concept
title: One write call carries one concept
summary: "When one page touches several concepts, each of them gets its own write call; the content of several concepts is never dumped into one document."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: One piece of material affects more than one concept.
conditions_does_not_apply_when: Only one concept is affected.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the concepts that were written
  - one write call for each of them
artifact_contract_verified_by: each affected concept has its own document and none of them holds the content of another
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 1
---

# One write call carries one concept
You may update multiple concepts from a single page.
If a page surfaces several of these at once (a typical "data model" or "schema reference" page), make **multiple** `write_concept_doc` calls — one per affected concept — rather than dumping everything into one doc.
