---
instruction_id: describe-a-concept-with-its-title-description-and-resource
title: "Describe a concept with its title, description and resource"
summary: "A concept carries a title, a one-sentence description, the URI of the asset it describes and its tags, so that a consumer can list, preview and find it without opening the body."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - output-formatting
conditions_applies_when: A concept document is written.
conditions_does_not_apply_when: The concept describes an abstract idea and has no underlying asset.
artifact_contract_output_type: concept-metadata
artifact_contract_required_data:
  - the title
  - the description
  - the resource
  - the tags
artifact_contract_verified_by: "the concept carries a title, a single-sentence description, the URI of the asset it describes and its tags"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Describe a concept with its title, description and resource
`title`: Human-readable display name.
If omitted, consumers MAY derive a title from the filename.
`description`: A single sentence summarizing the concept.
Used by `index.md` generators, search snippets, and previews.
`resource`: A URI that uniquely identifies the underlying asset the concept describes.
Absent for concepts that describe abstract ideas rather than physical resources.
`tags`: A YAML list of short strings for cross-cutting categorization.
