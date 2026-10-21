---
instruction_id: order-the-routing-rows-so-the-first-match-wins
title: Order the routing rows so the first match wins
summary: The routing table is read top to bottom and the first matching row decides; the rows that report a failure come before the row that reports success.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - decision-trail
conditions_applies_when: A routing table decides what happens next.
conditions_does_not_apply_when: There is a single unconditional route.
artifact_contract_output_type: routing-table
artifact_contract_required_data:
  - the rows in order
  - the row that matched
  - the route it selected
artifact_contract_verified_by: the first matching row was chosen and the failing states were tested before the passing one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress.md
status: active
revision: 1
---

# Order the routing rows so the first match wins
Rows are evaluated top to bottom; the first matching row wins.
so non-passed verification is not reported as complete
