---
instruction_id: make-the-tool-prove-its-identity-before-you-run-it
title: Make the tool prove its identity before you run it
summary: "A binary that answers the same verbs as another one is resolved by an identity proof, not by the name it was found under."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
conditions_applies_when: More than one package publishes a command with the same name.
conditions_does_not_apply_when: Only one package publishes it.
artifact_contract_output_type: tool-identity
artifact_contract_required_data:
  - the identity proof
  - the tool the proof confirmed
artifact_contract_verified_by: the tool was run only after it proved its own identity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/diagnose-a-foreign-gsd-tools.md
status: active
revision: 1
---

# Make the tool prove its identity before you run it
It stops rather than guessing — falling back to an arbitrary `gsd-tools` is exactly the behavior that caused #3129.
The resolver prefers its path-based branches — a project-local install, then a runtime config directory — and only falls back to a `gsd_run` found on `PATH` when that binary proves it is `@opengsd/gsd-core` (#4834): a foreign or too-old `gsd_run` on `PATH` is passed over, not used with a warning.
