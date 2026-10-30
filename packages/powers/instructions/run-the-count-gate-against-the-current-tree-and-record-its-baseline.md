---
instruction_id: run-the-count-gate-against-the-current-tree-and-record-its-baseline
title: Run the count gate against the current tree and record its baseline
summary: A gate that counts or matches text is run against the tree before it ships and its pre-change result is written next to it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A gate counts or matches text in the tree.
conditions_does_not_apply_when: The gate asserts the absence of a construct.
artifact_contract_output_type: gate-baseline
artifact_contract_required_data:
  - the gate command
  - the result at the current tree
  - the baseline written next to it
artifact_contract_verified_by: the gate was run and its baseline recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Run the count gate against the current tree and record its baseline
You have a shell when you author the plan, so run each such gate against the **current tree** and write the pre-change result next to it as its baseline (`# baseline at HEAD: 0`)
the gate measures nothing and passes whether or not the work happens. Fix the gate: anchor it to the new heading, key, or line the task creates, or assert a delta from the recorded baseline
**Its literal can never match the deliverable.** `grep` is case-sensitive, so `grep -c "quickstart"` fails on a correct `## Quickstart`. Match the real casing of the text the task writes, or use `-i` when casing is not part of the contract
A gate that is meant to prove a *negative* is checked the other way: it must pass after the work and its baseline must show the thing was there to remove. Only read-only commands are safe to run this way — run `grep`/`rg`/`test` gates; do not execute a gate that builds, installs, or writes
