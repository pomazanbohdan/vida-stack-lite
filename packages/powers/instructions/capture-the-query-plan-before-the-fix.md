---
instruction_id: capture-the-query-plan-before-the-fix
title: Capture the query plan before the fix
summary: "The query plan is captured before the change as the baseline and re-checked afterwards, and an index that did not change the plan is reverted."
capability_tags:
  - improve-web-performance
pattern_tags:
  - query-plan-discipline
conditions_applies_when: A slow query is about to be fixed with an index or a query change.
conditions_does_not_apply_when: No query is being changed.
artifact_contract_output_type: query-plan-before-and-after
artifact_contract_required_data:
  - the plan before the change
  - the plan after the change
  - the difference between them
artifact_contract_verified_by: "the plan after the change differs from the plan before it, and an unchanged plan means the change is reverted"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 1
---

# Capture the query plan before the fix
`EXPLAIN ANALYZE` captured **before** the fix, not just after — it is the baseline
`Seq Scan` on a large table understood: index missing, unusable, or genuinely not worth it
Estimated vs actual `rows=` within an order of magnitude (if not, refresh statistics before touching indexes)
No `Sort` node that a composite index could absorb
Plan re-checked after the change — an index that did not change the plan gets reverted
Indexing without reading the plan | Write cost paid, read gain unproven | `EXPLAIN ANALYZE` before and after; revert if the plan is unchanged
