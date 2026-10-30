---
instruction_id: keep-the-verification-sequence-in-one-canonical-place
title: Keep the verification sequence in one canonical place
summary: "One place holds the whole verification sequence, in one order; every caller runs it identically, and no step gates on a value that does not exist yet."
capability_tags:
  - execute-plan
pattern_tags:
  - single-source-of-truth
conditions_applies_when: More than one caller triggers the same verification.
conditions_does_not_apply_when: A single caller runs a one-off verification.
artifact_contract_output_type: verification-sequence
artifact_contract_required_data:
  - the sequence and its order
  - the callers that run it
  - the step that stopped the run
artifact_contract_verified_by: every caller runs the same sequence in the same order and no step gated on a value that did not exist yet
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Keep the verification sequence in one canonical place
it is the ONLY place the verification sequence is written, whole and in this order
There is no per-caller branch
both run every step below, in order, identically.
nothing is fingerprinted yet, and gating on it here would be a no-op by construction
