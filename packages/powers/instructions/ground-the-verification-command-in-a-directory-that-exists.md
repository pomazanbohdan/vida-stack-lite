---
instruction_id: ground-the-verification-command-in-a-directory-that-exists
title: Ground the verification command in a directory that exists
summary: "A verification command names a directory that exists and holds the matching manifest, and it is written so it does not depend on the working directory; an ungroundable path is declared instead of guessed."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A verification command is authored with a path of its own.
conditions_does_not_apply_when: The command is reused unchanged from a phase that already proved it.
artifact_contract_output_type: grounded-command
artifact_contract_required_data:
  - the target directory
  - the manifest that directory holds
  - the declaration when the path could not be grounded
artifact_contract_verified_by: "the target directory exists and holds the matching manifest, or the plan says the path could not be grounded"
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
  - operations
---

# Ground the verification command in a directory that exists
Ground every path you do author: a command's `cd` target or `npm --prefix` target must be a directory that exists (or that an earlier task in this phase creates) and, for an npm/make command, must hold the matching `package.json`/`Makefile`. `npm --prefix <dir> run <script>` is preferred over `cd <dir> && npm run <script>` - it does not depend on the executor's cwd. If `prior_verify_commands` is empty and you cannot ground a path, say so in the plan instead of guessing one.
Re-invention is what produced `cd ../../frontend && npm run lint` against a directory that holds no `package.json`, and cost two revision cycles.
