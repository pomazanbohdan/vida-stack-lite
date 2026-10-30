---
instruction_id: declare-the-contract-and-let-the-adapter-fill-the-backend-specifics
title: Declare the contract and let the adapter fill the backend specifics
summary: The planner declares the abstract contract of a job; the environment-specific details are filled in by the adapter that runs it.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A job is being planned for an environment the planner does not know.
conditions_does_not_apply_when: "The job's environment is fully known to the planner."
artifact_contract_output_type: job-contract
artifact_contract_required_data:
  - the declared contract
  - the fields the planner must not guess
  - the adapter that supplies the specifics
artifact_contract_verified_by: "the planner's declaration carries no environment-specific guess"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/external-job/fragments/plan-post.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/long-running-operations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Declare the contract and let the adapter fill the backend specifics
- Do not hardcode a cluster account, partition, or project path — the planner never knows the scheduler layout; it declares the contract, the executor's adapter fills the backend specifics.
- The design does not hardcode a cluster, account, partition, or project layout
- The `backend` field on the manifest (opaque to core) and the `external_job.backend` config key are the pluggability seams for future backends (LSF, PBS, Kubernetes batch).
