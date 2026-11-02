---
instruction_id: never-nest-a-repository-inside-an-existing-worktree
title: Never nest a repository inside an existing worktree
summary: Inside an existing worktree the repository is left alone and a warning says that the new files are tracked by the outer repository.
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A run is about to initialise a repository inside a directory that already belongs to one.
conditions_does_not_apply_when: The directory is not part of an existing repository.
artifact_contract_output_type: repository-init-decision
artifact_contract_required_data:
  - the decision
  - the warning about the outer repository
artifact_contract_verified_by: no nested repository was created and the outer tracking was reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never nest a repository inside an existing worktree
never create a nested `.git` inside an existing worktree
do NOT run `git init`.
Surface a warning that planning files will be tracked by the outer repo at
skip `git init`
