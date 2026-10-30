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
