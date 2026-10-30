---
instruction_id: let-the-project-hooks-run-by-default
title: Let the project hooks run by default
summary: "The project's own hooks run on every commit; bypassing them silently is not done unless the project explicitly opted out."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - automated-enforcement
conditions_applies_when: A change is committed.
conditions_does_not_apply_when: The repository has no hooks.
artifact_contract_output_type: commit-record
artifact_contract_required_data:
  - the commit
  - the hooks that ran
  - the opt-out when there was one
artifact_contract_verified_by: "the hooks ran, or the project's explicit opt-out was honoured"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/git-integration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let the project hooks run by default
run commits normally — let pre-commit hooks run. Do NOT pass `--no-verify` by default
Hooks should fire on the introducing commit;
absent that signal, hooks run normally.
