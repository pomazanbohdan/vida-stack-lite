---
instruction_id: regenerate-a-measured-table-from-one-consistent-run
title: Regenerate a measured table from one consistent run
summary: "A measured table is rebuilt from one run whose shards are disjoint, because mixing runs biases every entry towards the slowest run."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A measured timing table has to be rebuilt.
conditions_does_not_apply_when: The table is built from a single measurement of each file.
artifact_contract_output_type: regenerated-timing-table
artifact_contract_required_data:
  - the run the table came from
  - the entries it prices
artifact_contract_verified_by: the table came from one run whose shards covered the tier exactly once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/regenerate-the-win32-timing-table.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Regenerate a measured table from one consistent run
Use all three shards of **one** run. Each shard runs a disjoint slice of the tier, so together they price every file once. The generator keeps the max for a file seen more than once, so mixing runs biases the table toward each file's slowest run.
Like the Linux table, it is advisory: nothing fails when it goes stale.
