---
instruction_id: justify-an-index-with-a-query-plan
title: Justify an index with a query plan
summary: "Adding an index is the guess and the query plan is the measurement, and an index that did not change the plan is a revert."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A query is slow and an index is proposed.
conditions_does_not_apply_when: The query is already served by a usable index.
artifact_contract_output_type: index-justification
artifact_contract_required_data:
  - the plan before the change
  - the plan after it
  - the write cost considered
artifact_contract_verified_by: the plan after the change is compared with the plan before it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Justify an index with a query plan

"Add an index" is the guess; `EXPLAIN ANALYZE` is the measurement.
A `Seq Scan` where you expected an index, a `rows=` estimate off by an order of magnitude, and a `Sort` node above the scan each call for a different fix; a bad `rows=` estimate means stale statistics, so run `ANALYZE` rather than adding an index.
Index for the shape of the query (equality columns first, then the range or sort column).
A plain index will not help a query on a low-selectivity dominant value (a partial index serves the rare value), a leading wildcard (needs trigram or full-text), or a function applied to the column (index the expression, as in `WHERE lower(email) = ?`), and every index taxes every write.
Re-run the plan afterwards; an index that did not change it is a revert.
