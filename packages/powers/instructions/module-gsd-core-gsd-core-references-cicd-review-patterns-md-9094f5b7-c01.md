---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-cicd-review-patterns-md-9094f5b7-c01"
title: "gsd-core: gsd-core/references/cicd-review-patterns.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/cicd-review-patterns.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/cicd-review-patterns.md\"}"
atom_ids:
  - build-once-and-promote-the-same-artifact
  - guard-a-deploy-workflow-with-concurrency-and-timeout
  - make-every-pipeline-step-idempotent
atom_count: 3
atoms: "[{\"atom_id\":\"build-once-and-promote-the-same-artifact\",\"file_sha256\":\"ff34b32f50132ea1d87b34ffd0399422b6cf71518b1c3093629762b4f671d449\",\"content_sha256\":\"a3f348c9692c95b4d785793c041dfbe8f8e8583b3ffb64c268535d17bb8c9b2a\",\"file_bytes\":1870,\"body_bytes\":644},{\"atom_id\":\"guard-a-deploy-workflow-with-concurrency-and-timeout\",\"file_sha256\":\"da770b671b1cb287040a99273b7d15061a9714685b31c153ebe5467f1d874b51\",\"content_sha256\":\"50594959e05de500683ef25b2d0fea48f9d1be130e532ffa7f563a59d9ed0e94\",\"file_bytes\":1796,\"body_bytes\":591},{\"atom_id\":\"make-every-pipeline-step-idempotent\",\"file_sha256\":\"d99abd21782893ec88910d8a31b48e60345a60317fd9459a7bfb9d79106499b5\",\"content_sha256\":\"c3fba63b406509e64262dec283830f6aeac34c19894c51a645a0c8769547ae93\",\"file_bytes\":1721,\"body_bytes\":587}]"
carrier_sha256: beda2a1660c7bcc4c89b46ff34304ddbc834a6e2adcc6be40ca930b2bd1d334f
carrier_bytes: 5814
revision: 1
status: active
---
<!-- vpmodule:atom:begin build-once-and-promote-the-same-artifact -->
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
<!-- vpmodule:atom:end build-once-and-promote-the-same-artifact -->
<!-- vpmodule:atom:begin guard-a-deploy-workflow-with-concurrency-and-timeout -->
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
<!-- vpmodule:atom:end guard-a-deploy-workflow-with-concurrency-and-timeout -->
<!-- vpmodule:atom:begin make-every-pipeline-step-idempotent -->
---
instruction_id: make-every-pipeline-step-idempotent
title: Make every pipeline step idempotent
summary: "A pipeline step must be safe to re-run: use the lockfile install, pin dependencies, create with `-p`, guard deletes, and update live resources instead of deleting and recreating them."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A pipeline or deploy file is in review scope.
conditions_does_not_apply_when: The file is not a pipeline, deploy script or container build.
artifact_contract_output_type: pipeline-review-finding
artifact_contract_required_data:
  - the step
  - the re-run behavior
  - the evidence
artifact_contract_verified_by: every reported step names how a re-run differs or leaves the target broken
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

# Make every pipeline step idempotent
A pipeline step must be safe to re-run: `npm ci` where a lockfile exists, not `npm install`; pinned or lock-backed dependencies; `mkdir -p`; a guarded `rm`; create-or-update a live resource instead of delete-then-create.
A step that produces a different result on a re-run, or fails part-way and leaves the target broken, is a warning.
Pipeline files are recognized by path — `.github/workflows/*.yml`, `Dockerfile*`, `docker-compose*.yml`, and deploy scripts — not by extension. A deploy script is also a shell file: apply both sets of checks.
<!-- vpmodule:atom:end make-every-pipeline-step-idempotent -->