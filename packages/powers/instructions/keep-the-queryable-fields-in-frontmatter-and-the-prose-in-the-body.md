---
instruction_id: keep-the-queryable-fields-in-frontmatter-and-the-prose-in-the-body
title: Keep the queryable fields in frontmatter and the prose in the body
summary: "The few fields that are queried, filtered or indexed live in the frontmatter; the prose, the schemas and the examples live in the body."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A document of a knowledge corpus is written.
conditions_does_not_apply_when: The document is an index or a log file.
artifact_contract_output_type: document-layout
artifact_contract_required_data:
  - the fields in the frontmatter
  - the content of the body
artifact_contract_verified_by: the queryable fields are in the frontmatter and the prose is in the body
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=README.md
status: active
revision: 1
---

# Keep the queryable fields in frontmatter and the prose in the body
Use frontmatter for the few fields you want to query, filter, or index on (`type`, `resource`, `tags`, `generated`, `status`); use the markdown body for the prose, schemas, and example queries that LLMs and humans actually read.
