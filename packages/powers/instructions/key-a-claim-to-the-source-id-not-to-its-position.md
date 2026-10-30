---
instruction_id: key-a-claim-to-the-source-id-not-to-its-position
title: "Key a claim to the source id, not to its position"
summary: "A claim is attributed through a footnote whose label is the key of the source entry, so that reordering the source list never moves an attribution."
capability_tags:
  - research-primary-sources
pattern_tags:
  - provenance-record
conditions_applies_when: A body attributes a specific claim to one of the recorded sources.
conditions_does_not_apply_when: The document carries no claim that needs a source.
artifact_contract_output_type: claim-attribution
artifact_contract_required_data:
  - the claim
  - the key of the source it is attributed to
artifact_contract_verified_by: every attributed claim names the key of its source and not a position in the list
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
  - research
---

# Key a claim to the source id, not to its position
Per-claim attribution to external sources uses markdown footnotes keyed to `sources` entries rather than a body citations list (§5.1).
The footnote label is the join key into `sources`; consumers resolve attribution through the matching entry, not by parsing the footnote prose.
Labels are keyed rather than positional (`sources[0]`) because agents constantly rewrite these documents: a positional index misattributes silently the moment the list is reordered, whereas a stable `id` survives reordering.
