---
instruction_id: synthesize-the-listing-when-the-corpus-has-none
title: Synthesize the listing when the corpus has none
summary: "A directory listing lets a reader see what is available before opening a document; when the corpus has no listing, the consumer can build one while it reads."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A consumer has to find what a corpus holds before it opens the documents.
conditions_does_not_apply_when: The corpus holds a single document.
artifact_contract_output_type: directory-listing
artifact_contract_required_data:
  - the documents of the directory
  - the description of each entry
artifact_contract_verified_by: the listing names every document of the directory and carries its description
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
  - engineering
  - operations
---

# Synthesize the listing when the corpus has none
An `index.md` file MAY appear in any directory, including the bundle root.
It enumerates the directory's contents to support **progressive disclosure**: letting a human or agent see what is available before opening individual documents.
Producers MAY generate `index.md` automatically; consumers MAY synthesize one on the fly when none is present.
