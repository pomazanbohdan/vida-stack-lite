---
instruction_id: a-hard-cap-on-the-input-set-stops-the-run
title: A hard cap on the input set stops the run
summary: "When the discovered set is larger than the cap, the run stops and says how to narrow the scope instead of proceeding with more input than the run can hold."
capability_tags:
  - harden-validation
pattern_tags:
  - resource-bounds
conditions_applies_when: A run collects a set whose size it cannot bound.
conditions_does_not_apply_when: "The set is within the cap, or the caller narrowed it explicitly."
artifact_contract_output_type: cap-refusal
artifact_contract_required_data:
  - the number found
  - the cap
  - the way to narrow the scope
artifact_contract_verified_by: the run stopped at the cap and the caller was told how to narrow the scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ingest-docs.md
status: active
revision: 1
---

# A hard cap on the input set stops the run
Cap: hard limit of 50 docs per invocation (documented v1 constraint). If the discovered set exceeds 50:
Discovered {N} docs, which exceeds the v1 cap of 50.
Exit without proceeding.
On Revise: exit with guidance to re-run with
