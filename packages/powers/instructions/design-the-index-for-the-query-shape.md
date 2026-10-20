---
instruction_id: design-the-index-for-the-query-shape
title: Design the index for the query shape
summary: "An index is built for the filter and the sort of one query, its write cost is measured, and the indexes nothing reads are dropped."
capability_tags:
  - improve-performance
pattern_tags:
  - query-plan-discipline
conditions_applies_when: An index is added to a table.
conditions_does_not_apply_when: No index is added or changed.
artifact_contract_output_type: index-design-note
artifact_contract_required_data:
  - the query the index serves
  - the column order
  - the write cost measured
  - the indexes dropped
artifact_contract_verified_by: the index serves the filter and the sort of the named query and the write cost was measured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 2
---

# Design the index for the query shape
Composite index column order is equality first, then range/sort
Index covers the query shape (filter + sort), not just one column in isolation
Covering index considered for hot read paths (index-only scan avoids the heap fetch)
Not indexing low-selectivity columns *for the dominant value*; a partial index still serves the rare-value query (`WHERE status = 'failed'`)
Expression index used where the query applies a function (`lower(email)`)
Full-text or trigram index used for leading-wildcard search, not a B-tree
Write cost measured on write-heavy tables (every index taxes every `INSERT`/`UPDATE`)
Unused and duplicate indexes dropped (they cost writes and buy nothing)
Missing indexes | Slow reads as data grows | Add indexes for filtered/sorted columns
Redundant / unused indexes | Every write pays for them | Audit usage stats, drop what nothing reads
