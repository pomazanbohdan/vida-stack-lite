---
instruction_id: require-deterministic-evidence-before-a-new-finding-blocks
title: Require deterministic evidence before a new finding blocks
summary: A finding that was not already in scope blocks only when a named test fails or a command reproduces it.
capability_tags:
  - review-code
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A new finding is about to be raised as a blocker.
conditions_does_not_apply_when: The finding is a carried-forward gap or a regression.
artifact_contract_output_type: finding-evidence
artifact_contract_required_data:
  - the deterministic evidence
  - the command that was run
artifact_contract_verified_by: the blocker carries a command and its output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verifier-evidence-gate.md
status: active
revision: 1
---

# Require deterministic evidence before a new finding blocks
Deterministic evidence — required for a new-scope finding to stay blocking. One of:
A **named test that FAILS when actually run** (red). Run exactly one test, the same discipline Step 7b already uses for behavioral spot-checks — never the full suite. Record the exact command and the failing output
Another concrete, reproducible artifact — a command + output that demonstrates the defect (a crash, a probe failure, a reproducible bad response). An assertion, opinion, or architectural preference with no test and no reproducible command output is not evidence, however well-reasoned
New-scope finding **without** deterministic evidence → downgrade out of the blocker set
Record it in the `advisory:` frontmatter list
It does **not** count toward Step 9 Rule 1's `gaps_found` trigger and does **not** revert a completed must-have
