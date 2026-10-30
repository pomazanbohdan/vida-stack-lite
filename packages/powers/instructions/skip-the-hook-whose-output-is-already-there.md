---
instruction_id: skip-the-hook-whose-output-is-already-there
title: Skip the hook whose output is already there
summary: "A step whose declared outputs are all present is skipped rather than run again, so a second run cannot rewrite a file the report already covers."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A step declares what it produces and its output is already on disk.
conditions_does_not_apply_when: The step has produced nothing yet.
artifact_contract_output_type: produces-present-skip
artifact_contract_required_data:
  - "the step's declared outputs"
  - the presence check
  - the reason the skip is recorded under
artifact_contract_verified_by: the step was skipped because its declared outputs were already present
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/review-verification-capabilities.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Skip the hook whose output is already there
- A `step` hook with a non-empty `produces` list, every entry of which already exists in the phase directory (for example `01-SECURITY.md` for `SECURITY.md`), moves from `activeHooks` to `skippedHooks` with `reason: "produces-present"`.
- Re-running it would rewrite a file the verification report may cover and leave the report `stale` against the workflow's own write.
