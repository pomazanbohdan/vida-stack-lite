---
instruction_id: require-the-core-artifacts-and-skip-the-optional-ones-gracefully
title: Require the core artifacts and skip the optional ones gracefully
summary: "The plan and summary documents are required and their absence stops the extraction; the verification, acceptance-test and state documents are read when they exist and their absence is recorded."
capability_tags:
  - curate-context
pattern_tags:
  - empty-result-policy
conditions_applies_when: A learnings extraction starts and the artefacts are collected.
conditions_does_not_apply_when: The extraction was already run.
artifact_contract_output_type: artifact-availability-report
artifact_contract_required_data:
  - the required artefacts that were found
  - the optional artefacts that were missing
artifact_contract_verified_by: the missing optional artefacts are recorded and the extraction stopped only on a missing core artefact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 1
---

# Require the core artifacts and skip the optional ones gracefully
Read the phase artifacts. PLAN.md and SUMMARY.md are required; VERIFICATION.md, UAT.md, and STATE.md are optional.
If PLAN.md or SUMMARY.md files are not found or missing, exit with error: "Required artifacts missing. PLAN.md and SUMMARY.md are required for learning extraction."
Track which optional artifacts are missing for the `missing_artifacts` frontmatter field.
