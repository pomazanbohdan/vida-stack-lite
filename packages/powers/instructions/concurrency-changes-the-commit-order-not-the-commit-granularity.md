---
instruction_id: concurrency-changes-the-commit-order-not-the-commit-granularity
title: "Concurrency changes the commit order, not the commit granularity"
summary: "Running the units in parallel makes them commit in completion order, but each unit still gets its own commit and they are never combined into one."
capability_tags:
  - integrate-branch
pattern_tags:
  - parallel-execution
conditions_applies_when: Independent units of work are executed at the same time.
conditions_does_not_apply_when: The units are executed one after another.
artifact_contract_output_type: commit-granularity-record
artifact_contract_required_data:
  - the units
  - the commit each one got
  - the order they landed in
artifact_contract_verified_by: every unit has its own commit and no commit carries more than one unit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-concurrent-chunked-planning.md
status: active
revision: 1
---

# Concurrency changes the commit order, not the commit granularity
With concurrent dispatch, whichever plans in a batch finish first commit first — still one commit per plan, never a combined commit, but not necessarily in outline order within a batch.
