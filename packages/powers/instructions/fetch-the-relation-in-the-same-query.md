---
instruction_id: fetch-the-relation-in-the-same-query
title: Fetch the relation in the same query
summary: "One query per row is the most common backend bottleneck, so fetch the relation in the same query instead of in the loop."
capability_tags:
  - improve-runtime-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Code loads a collection and then loads a related record for each item.
conditions_does_not_apply_when: The related record is not loaded once per item.
artifact_contract_output_type: query-change
artifact_contract_required_data:
  - the loop that fetched per row
  - the single query that replaces it
artifact_contract_verified_by: the number of queries no longer grows with the number of rows
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 1
---

# Fetch the relation in the same query

**N+1 queries.**
One query per row is the most common backend bottleneck.
Fetch the relation in the same query (join/include) instead of in the loop.
