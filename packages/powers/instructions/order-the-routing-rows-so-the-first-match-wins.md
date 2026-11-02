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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Order the routing rows so the first match wins
Rows are evaluated top to bottom; the first matching row wins.
so non-passed verification is not reported as complete
