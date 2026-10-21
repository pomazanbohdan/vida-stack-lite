---
instruction_id: run-the-count-gate-before-it-ships-and-record-its-baseline
title: Run the count gate before it ships and record its baseline
summary: "A gate that counts or matches text is run against the current tree and its pre-change result is written next to it, because two defects - a gate that already passes and a literal that can never match - are invisible to reading."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A gate is authored that counts or matches text in the tree.
conditions_does_not_apply_when: The gate proves a behaviour by running the code rather than by matching text.
artifact_contract_output_type: gate-baseline
artifact_contract_required_data:
  - the gate
  - the pre-change result
  - "the defect that was found, if any"
artifact_contract_verified_by: the baseline of every count gate is recorded and the gate is anchored to what the task creates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 1
---

# Run the count gate before it ships and record its baseline
**Run a count/match gate before it ships.** A gate you author - or one a research document hands you - that counts or matches text (`grep -c`, `grep -q`, `rg`, `test -n "$(grep …)"`) is a claim about the tree, and two defects are invisible to reading and take one command to expose. You have a shell when you author the plan, so run each such gate against the **current tree** and write the pre-change result next to it as its baseline (`# baseline at HEAD: 0`):
- **It already passes at HEAD.** The gate measures nothing and passes whether or not the work happens. Fix the gate: anchor it to the new heading, key, or line the task creates, or assert a delta from the recorded baseline.
- **Its literal can never match the deliverable.** `grep` is case-sensitive, so `grep -c "quickstart"` fails on a correct `## Quickstart`. Match the real casing of the text the task writes, or use `-i` when casing is not part of the contract.
A gate that is meant to prove a *negative* is checked the other way: it must pass after the work and its baseline must show the thing was there to remove. Only read-only commands are safe to run this way - run `grep`/`rg`/`test` gates; do not execute a gate that builds, installs, or writes.
