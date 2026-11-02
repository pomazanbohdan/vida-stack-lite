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
