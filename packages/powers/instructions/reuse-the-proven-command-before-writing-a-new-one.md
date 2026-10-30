---
instruction_id: reuse-the-proven-command-before-writing-a-new-one
title: Reuse the proven command before writing a new one
summary: A command that already resolved in a real run is inherited rather than rewritten.
capability_tags:
  - plan-implementation
pattern_tags:
  - project-conventions-first
conditions_applies_when: A verify command has to be written for a new plan.
conditions_does_not_apply_when: No prior phase ran an equivalent command.
artifact_contract_output_type: inherited-verify-command
artifact_contract_required_data:
  - the inherited command
  - the phase it came from
artifact_contract_verified_by: the plan reuses the inherited command verbatim
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-verify-command-path-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reuse the proven command before writing a new one
The planner is handed `prior_verify_commands` — the `<automated>` commands from the nearest prior phase that had any — at **every** context window.
If a previous phase already lints or builds the same tree, that command resolved in a real run. Reuse it verbatim.
If that returns commands, the fix is usually a copy-paste, not a new path.
