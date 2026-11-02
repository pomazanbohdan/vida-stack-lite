---
instruction_id: guard-a-deploy-workflow-with-concurrency-and-timeout
title: Guard a deploy workflow with concurrency and timeout
summary: "A deploy workflow needs a job timeout and a concurrency group that cancels the older run, so a stuck or overlapping job cannot hold the runner or deploy over a newer commit."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A pipeline file is a deploy workflow.
conditions_does_not_apply_when: The workflow only runs tests or builds without deploying.
artifact_contract_output_type: pipeline-review-finding
artifact_contract_required_data:
  - the deploy workflow
  - the missing timeout or concurrency guard
  - the evidence that it deploys
artifact_contract_verified_by: every deploy workflow is checked for a job timeout and a cancelling concurrency group
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/cicd-review-patterns.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Guard a deploy workflow with concurrency and timeout
A deploy workflow needs a job-level `timeout-minutes` so a stuck job does not hold the runner for the default, and a `concurrency` group with `cancel-in-progress: true` so an older run cannot finish last and deploy over a newer commit.
Name the trigger, environment or deploy command that makes it a deploy workflow; these checks do not apply to a CI-only workflow, where concurrency is an optimization.
A load-bearing `continue-on-error: true` on a step whose success later steps assume is a warning; an informational step may use it.
