---
instruction_id: resolve-the-command-path-without-running-the-command
title: Resolve the command path without running the command
summary: "The path a verification command points at is resolved deterministically, and the command text is never executed, because the text is model-authored."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verification command written by a model has to be checked before it is trusted.
conditions_does_not_apply_when: The command text is written by the owner and approved.
artifact_contract_output_type: command-path-probe
artifact_contract_required_data:
  - the resolved target directory
  - whether the target exists
  - whether the manifest the command needs is present
artifact_contract_verified_by: the probe resolved a path and read only file names; no command text was executed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/verify-command-path-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Resolve the command path without running the command
It never executes command text.
So running it from the checker would be arbitrary code execution — and would trigger the real lint/build as a side effect.
The probe only resolves paths and stats directories; a `package.json` it finds is read for script names only.
Interpreting shell would mean maintaining a bad shell.
Any path carrying a variable, glob, substitution, or `~` returns `unresolvable`, which is a warning and never a blocker.
The parser's incompleteness is the specification: it degrades to "cannot prove" rather than growing features.
Refusing to guess is the fix, not a limitation of it.
The payload carries the target that failed and what was missing; there is deliberately no `suggestion` field.
Choosing the replacement is the planner's job — and the planner now has the prior phase's proven command to reach for.
