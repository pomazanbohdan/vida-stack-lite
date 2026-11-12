---
schema: VPInstructionModule/v1
instruction_id: "module-open-knowledge-format-src-reference-agent-prompts-web-ingestion-instruction-md-fec1f6b0-c02"
title: "open-knowledge-format: src/reference_agent/prompts/web_ingestion_instruction.md module"
summary: "Carrier for 2 atomic instructions from open-knowledge-format:src/reference_agent/prompts/web_ingestion_instruction.md."
source: "{\"donor\":\"open-knowledge-format\",\"path\":\"src/reference_agent/prompts/web_ingestion_instruction.md\"}"
atom_ids:
  - name-the-derived-file-the-same-way-every-time
  - one-write-call-carries-one-concept
atom_count: 2
atoms: "[{\"atom_id\":\"name-the-derived-file-the-same-way-every-time\",\"file_sha256\":\"22070cbfbec749300dab71cc0677f9ef73a253500bd0c4cc2ea2d0a4c4372977\",\"content_sha256\":\"cb7fb606ea37c767c0fb5fd45ba24f25fc99a767257a5ae3d0c6aa38929020a5\",\"file_bytes\":1405,\"body_bytes\":267},{\"atom_id\":\"one-write-call-carries-one-concept\",\"file_sha256\":\"4ade197842a49b455fa9657cb2ff72e262f750c8607b5351d3628745286c757c\",\"content_sha256\":\"98bbadbcf3fac7cb13ef886957a8a1854c2c6a7c08e5e21eb58fb6e1ce1f4086\",\"file_bytes\":1513,\"body_bytes\":309}]"
carrier_sha256: c096617f1aec9efd20c94fe0a66b63406f906c26b0101aee9dca5b343dfa4108
carrier_bytes: 3191
revision: 1
status: active
---
<!-- vpmodule:atom:begin name-the-derived-file-the-same-way-every-time -->
---
instruction_id: name-the-derived-file-the-same-way-every-time
title: Name the derived file the same way every time
summary: "A derived file is named from its content in one fixed way, so the same pair of things always lands in the same file whichever side it was found from."
capability_tags:
  - check-for-name-collisions
pattern_tags:
  - stable-identity
conditions_applies_when: A file is created for a pair or an item that can be reached from two sides.
conditions_does_not_apply_when: There is exactly one way to reach the item.
artifact_contract_output_type: file-name
artifact_contract_required_data:
  - the name of the file
  - the rule that produced it
artifact_contract_verified_by: the same pair of items always produces the same file name
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the derived file the same way every time
**Destination**: one `references/joins/<a>__<b>.md` file *per pair*, with the two table names sorted alphabetically and joined by a double underscore
One canonical file per pair, regardless of which side you came from.
<!-- vpmodule:atom:end name-the-derived-file-the-same-way-every-time -->
<!-- vpmodule:atom:begin one-write-call-carries-one-concept -->
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
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body requires separate concept-document writes but gives no source-grounded substance for a supported domain.
---

# One write call carries one concept
You may update multiple concepts from a single page.
If a page surfaces several of these at once (a typical "data model" or "schema reference" page), make **multiple** `write_concept_doc` calls — one per affected concept — rather than dumping everything into one doc.
<!-- vpmodule:atom:end one-write-call-carries-one-concept -->