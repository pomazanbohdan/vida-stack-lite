---
instruction_id: use-the-bundle-root-for-an-absolute-cross-link
title: Use the bundle root for an absolute cross-link
summary: "A link between documents is written from the root of the corpus, so that moving a document inside its own directory does not break the link."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - cross-reference-linking
conditions_applies_when: A document links to another document of the same corpus.
conditions_does_not_apply_when: The link points at a resource outside the corpus.
artifact_contract_output_type: cross-link
artifact_contract_required_data:
  - the link as written
  - the root it is resolved against
artifact_contract_verified_by: the link starts at the root of the corpus and resolves to the document it names
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
---

# Use the bundle root for an absolute cross-link
Concepts MAY link to other concepts using standard markdown links.
**Absolute (bundle-relative):** begins with `/`, interpreted relative to the bundle root.
This is the **recommended** form because it is stable when documents are moved within their subdirectory.
**Relative:** a standard markdown relative path.
Use file-relative paths only. Never start a link with `/` (that breaks GitHub rendering), and don’t use bare filenames that aren’t actual siblings.
