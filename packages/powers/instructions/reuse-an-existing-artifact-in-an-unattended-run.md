---
instruction_id: reuse-an-existing-artifact-in-an-unattended-run
title: Reuse an existing artifact in an unattended run
summary: "When nobody is present to answer, an artifact that already exists is reused as it is; regenerating it would overwrite answers a person had already recorded."
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: An unattended run finds an artifact that a previous run already wrote.
conditions_does_not_apply_when: The run is attended and the person is asked what to do with the existing artifact.
artifact_contract_output_type: artifact-reuse-decision
artifact_contract_required_data:
  - the existing artifact
  - the option taken
  - the reason it was not regenerated
artifact_contract_verified_by: the existing artifact was kept and nothing a person had recorded was overwritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ui-phase.md
status: active
revision: 1
---

# Reuse an existing artifact in an unattended run
An unattended run reuses an existing artifact rather than regenerating it (#4776): "Update it" re-scores and rewrites the spec, discarding answers a person already recorded in it, and nobody is present to notice.
Skip is the auto choice because it is the only non-destructive one: "Update" re-runs the researcher, which rewrites the whole contract and drops answers a person already recorded in it, and "View" exits without verifying anything.
