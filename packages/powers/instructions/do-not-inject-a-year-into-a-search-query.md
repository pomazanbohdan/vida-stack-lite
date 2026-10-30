---
instruction_id: do-not-inject-a-year-into-a-search-query
title: Do not inject a year into a search query
summary: "A year in the query biases the result set toward dated content; the freshness of a source is read from its publication date, not asked for in the query."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A question is going to a web or documentation search.
conditions_does_not_apply_when: The search is against a local index with its own dates.
artifact_contract_output_type: search-query
artifact_contract_required_data:
  - the query text
  - the publication date of each result you read
artifact_contract_verified_by: no year appears in the query and every source you rely on carries a publication date you checked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-project-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Do not inject a year into a search query
**WebSearch tip:** Do not inject a year into queries — it biases results toward stale dated content; check publication dates on the results you read instead.
