---
instruction_id: key-the-fact-so-a-rerun-does-not-duplicate-it
title: Key the fact so a rerun does not duplicate it
summary: Every written fact and every link carries a natural key that is looked up before it is written.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - stable-identity
conditions_applies_when: Facts or links are written into a store that can be written twice.
conditions_does_not_apply_when: The store is written exactly once by construction.
artifact_contract_output_type: curation-report
artifact_contract_required_data:
  - the key
  - the write decision
artifact_contract_verified_by: the key was looked up before the write and an existing entry was updated instead of appended
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-mempalace-curator.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-mempalace-curator.compact.md
status: active
revision: 1
---

# Key the fact so a rerun does not duplicate it
the triple `(subject, predicate, object)` is the natural key
so reruns don't fork duplicate facts
check the `find_tunnels` result first and skip creation if a tunnel with that `(source-wing, target-wing, label)` already exists
Do not mass-create tunnels.
