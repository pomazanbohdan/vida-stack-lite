---
instruction_id: design-a-bespoke-workflow
title: Adapt a workflow to the target repository
summary: "Merge a copied workflow into the target repository without discarding local edits, keep user-owned configuration outside it, and fail setup while a required value stays ambiguous."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A copied workflow, automation pack, or configuration has to run in a specific repository."
conditions_does_not_apply_when: The workflow is already installed and runs without manual corrections.
artifact_contract_output_type: project-workflow
artifact_contract_required_data:
  - destination paths
  - merged files
  - user-owned configuration
  - required values
  - model slugs
artifact_contract_verified_by: the workflow run on a clean copy of the project
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/setup-benny/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=docs/guide/09-make-it-yours.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Adapt a workflow to the target repository
Merge the entire source pack into the destination: create the destination when it is absent, and copy every source file to the same relative path.
Preserve destination-only files, and never delete unrelated files during install or refresh.
Keep user-owned configuration, feature maps, and routing maps outside the destination, and never overwrite them.
When an existing source-managed file differs, inspect the diff and merge without discarding local edits.
If ownership is ambiguous, stop and ask before replacing it.
Verify that the destination contains every file the workflow reads.
Do not edit the copied examples; refreshes may update source-managed files after conflict review, but they must never touch the user-owned copies.
Prefer committed, secret-free files in the target repository when a fresh automation checkout must read them.
Otherwise paraphrase the required values into the live prompt.
Use stable repository-relative paths for committed pack and configuration files, and never reference the plugin source directory or a cache path from a live automation.
Use only model slugs shown as available, and do not guess a slug or carry over a private default.
The source channel, triage identity, repository, tracker adapter, control skill, and feature map must be explicit, and setup fails if any required value stays ambiguous.
Start smaller than you think: you don't need many skills on day one.
Prompt plainly, watch where agents fail, and add a skill or a check when the same failure shows up twice.
Never put a secret value in plugin files, prompts, or committed configuration.
