---
instruction_id: build-once-and-promote-the-same-artifact
title: Build once and promote the same artifact
summary: "Build the artifact once and promote that same artifact through environments; a per-environment rebuild, a deploy without a health check or rollback, and static cloud credentials for a provider that supports OIDC are warnings."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A deploy pipeline is reviewed.
conditions_does_not_apply_when: The pipeline only tests or builds without deploying.
artifact_contract_output_type: pipeline-review-finding
artifact_contract_required_data:
  - the build and deploy steps
  - the artifact identity
  - the rollback and credential evidence
artifact_contract_verified_by: the deployed artifact is the one CI built, and a rollback path and credential source are named
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

# Build once and promote the same artifact
Build the artifact once and promote that same artifact through environments; do not rebuild the same commit separately per environment. The artifact that reaches production must be the one that passed CI.
A deploy step needs a post-deploy health check and a rollback path. A static cloud credential for a provider that supports OIDC is a warning; use a short-lived token where the provider can issue one.
An unpinned third-party action (`@main`, `@master`, `@latest`) is a warning; a version tag or a full commit SHA is a pin. Local actions and `docker://` references are not third-party action refs.
