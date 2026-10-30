---
instruction_id: withhold-the-untrusted-paths-from-the-tool
title: Withhold the untrusted paths from the tool
summary: "Paths that are absolute, traversing, or carry odd characters are neither passed to the tool nor listed."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: Paths found in the workspace are about to be handed to a tool that acts on them.
conditions_does_not_apply_when: The paths came from the trusted configuration of the run.
artifact_contract_output_type: path-list
artifact_contract_required_data:
  - the paths passed on
  - the paths withheld
artifact_contract_verified_by: the withheld paths are neither passed to the tool nor listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Withhold the untrusted paths from the tool
{N} path(s) withheld: not passed to the mapper or listed (absolute, traversal, whitespace, non-ASCII or shell-metacharacter characters)
