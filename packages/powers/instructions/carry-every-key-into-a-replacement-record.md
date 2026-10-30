---
instruction_id: carry-every-key-into-a-replacement-record
title: Carry every key into a replacement record
summary: "A record that is written again replaces the old one completely: the new record carries every key the old one had, and a key that is left out is lost."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - override-layering
conditions_applies_when: A record with a fixed set of keys is written again over an existing one.
conditions_does_not_apply_when: The record is created for the first time.
artifact_contract_output_type: record-replacement
artifact_contract_required_data:
  - every key the previous record had
  - the values that are kept
  - the key that may be dropped
artifact_contract_verified_by: "no key of the previous record is missing in the new one, except `generated`, which is omitted so the tool refreshes it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Carry every key into a replacement record
`write_concept_doc` does a full replacement, not a patch — the `frontmatter` argument **must include every key** the existing doc had (`type`, `title`, `description`, `resource`, `tags`, etc.).
Omitting a key drops it.
The augmentation rule is about which *values* you keep, not which *keys* you send.
Copy `type` verbatim from the existing frontmatter into your new dict.
The web page’s `<title>` is not the concept’s title.
The web page URL goes in the `sources` list, never in `resource`.
You may refine `description` if the web page surfaces a more accurate one-sentence summary; otherwise copy it verbatim.
Leave `generated` unset (omit the key) so the tool refreshes it.
This is the *only* key you may legitimately drop.
