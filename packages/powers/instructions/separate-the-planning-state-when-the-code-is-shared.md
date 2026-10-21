---
instruction_id: separate-the-planning-state-when-the-code-is-shared
title: Separate the planning state when the code is shared
summary: "Concurrent areas get separate planning state while the source tree, the history and the branches stay shared."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Two areas of the same codebase are worked on at the same time.
conditions_does_not_apply_when: The work is in two separate repositories.
artifact_contract_output_type: workstream-isolation
artifact_contract_required_data:
  - the isolated planning area
  - the shared code and history
artifact_contract_verified_by: the two areas have separate planning state and the code is still shared
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/work-in-parallel-with-workstreams.md
status: active
revision: 1
---

# Separate the planning state when the code is shared
A workstream is an isolated planning context within a single codebase.
The codebase itself — source code, git history, and branches — is shared across all workstreams.
