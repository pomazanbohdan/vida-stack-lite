---
instruction_id: reconcile-a-reported-measurement-with-the-same-instrument
title: Reconcile a reported measurement with the same instrument
summary: "A number the work reported about itself is checked with the same instrument that produced it, bounded to the window that number covers; an unbounded count proves nothing either way."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A record claims a measured number about the work it describes.
conditions_does_not_apply_when: The record makes no measured claim.
artifact_contract_output_type: measurement-reconciliation
artifact_contract_required_data:
  - the claimed number
  - the window it covers
  - the measured number
  - the verdict
artifact_contract_verified_by: the claim was measured with the same instrument inside its own window and never against a wider one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reconcile a reported measurement with the same instrument
A SUMMARY's `commits:` frontmatter is a MEASURED number (the executor derives it from its on-disk plan commit ledger and records the base as `plan_head_before:`), and this is where that claim is checked against reality with the SAME instrument — the executor's own narration is never the last word.
A `commits: absent` or `plan_head_before: absent` SUMMARY (pre-#3968 legacy) is reported as a WARNING with the measured git state, not a mismatch.
Consistent → done.
Anything else is a blocking mismatch — `commit_claim_mismatch` with both numbers and the SUMMARY path:
The unbounded `${BASE}..HEAD` count is NOT evidence either way: it grows with every later plan's commits and execute-phase's own phase-completion commit, so an honest plan would read as a mismatch (#4670).
The old `ACTUAL == CLAIMED` / `ACTUAL == CLAIMED + 1` tolerance was a guess that later plans' commits defeat
