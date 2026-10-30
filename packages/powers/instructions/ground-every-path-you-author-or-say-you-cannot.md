---
instruction_id: ground-every-path-you-author-or-say-you-cannot
title: "Ground every path you author, or say you cannot"
summary: A path in a verification command must resolve to a directory that exists and holds the manifest; when it cannot be grounded the plan says so.
capability_tags:
  - verify-work-results
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A verification command names a directory.
conditions_does_not_apply_when: The command was inherited verbatim from a prior phase.
artifact_contract_output_type: grounded-command
artifact_contract_required_data:
  - the target directory
  - the manifest it must hold
  - the statement when it cannot be grounded
artifact_contract_verified_by: "every authored path resolves, or the plan states that it cannot be grounded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Ground every path you author, or say you cannot
Ground every path you do author: a command's `cd` target or `npm --prefix` target must be a directory that exists (or that an earlier task in this phase creates) and, for an npm/make command, must hold the matching `package.json`/`Makefile`
`npm --prefix <dir> run <script>` is preferred over `cd <dir> && npm run <script>` — it does not depend on the executor's cwd
If `prior_verify_commands` is empty and you cannot ground a path, say so in the plan instead of guessing one
