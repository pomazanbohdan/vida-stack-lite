---
instruction_id: verify-the-artifact-you-will-build-on-is-complete
title: Verify the artifact you will build on is complete
summary: "The artefact the next stage depends on is checked for existence and substance before that stage runs; an inline return is persisted, and an unrecoverable one stops the run."
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - completion-criteria
conditions_applies_when: A stage hands an artefact to the next stage.
conditions_does_not_apply_when: The artefact was already verified in this run.
artifact_contract_output_type: artifact-verification
artifact_contract_required_data:
  - the existence and substance check
  - the persisted document
  - the error that stops the run
artifact_contract_verified_by: the next stage never runs against a missing or truncated artefact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
status: active
revision: 1
---

# Verify the artifact you will build on is complete
exists AND is substantive - non-empty, and free of any leftover
continuation sentinel (which marks a truncated/incomplete write).
never runs against a missing or truncated
Prompt hardening alone does not fully eliminate it, so the orchestrator MUST absorb either cause deterministically
A brief return is not the file.
If it is missing, surface the error.
Never build on a truncated artifact.
