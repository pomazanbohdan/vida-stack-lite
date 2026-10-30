---
instruction_id: pass-the-observed-value-instead-of-inferring-it
title: Pass the observed value instead of inferring it
summary: "When the real value can be measured, the measurement is passed in and the check evaluates it; the check does not infer what the value must have been."
capability_tags:
  - measure-performance
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check would otherwise infer the state of a thing it could measure.
conditions_does_not_apply_when: The thing cannot be observed.
artifact_contract_output_type: measured-check
artifact_contract_required_data:
  - the observed value
  - the verdict the check reaches with it
artifact_contract_verified_by: the check ran on the measured value and no value was inferred in its place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/fix-worktree-base-mismatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Pass the observed value instead of inferring it
If you have a real measurement of what a worktree on this host forked from (`git rev-parse HEAD` inside a freshly created isolated worktree, before any commit — the full sha, not an abbreviation), pass it and the check evaluates that instead of inferring:
A match returns `reason: "observed-fork-matches-head"`; a mismatch with `"head"` set returns `reason: "baseref-head-ignored-by-harness"` — that worktree was not forked from HEAD despite the setting — and the run degrades to sequential as before.
