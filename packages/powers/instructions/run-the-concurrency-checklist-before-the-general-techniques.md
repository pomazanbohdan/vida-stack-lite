---
instruction_id: run-the-concurrency-checklist-before-the-general-techniques
title: Run the concurrency checklist before the general techniques
summary: "When interleaved execution is suspected, atomicity, order and deadlock are checked before any general technique."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: The failure was classified as concurrent.
conditions_does_not_apply_when: The failure is deterministic and reproduces on every run.
artifact_contract_output_type: concurrency-check
artifact_contract_required_data:
  - the atomicity finding
  - the order finding
  - the deadlock finding
  - the leading hypothesis
artifact_contract_verified_by: the three checks were run and their outcome recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-bug-taxonomy.md
status: active
revision: 1
---

# Run the concurrency checklist before the general techniques
Run this BEFORE general techniques:
Atomicity — is a read-modify-write non-atomic? (check-then-act without a lock, missing compare-and-swap, a "get then set" across an await/yield)
Order — can two operations legally interleave to produce the bad state? (missing happens-before / synchronization; publish-before-init; init order across async boundaries)
Deadlock — circular wait on locks/resources? (hold-and-wait, no preemption, mutual blocking on shared resources)
If any branch hits, that becomes the leading hypothesis
