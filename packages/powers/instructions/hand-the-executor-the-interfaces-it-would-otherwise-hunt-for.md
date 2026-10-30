---
instruction_id: hand-the-executor-the-interfaces-it-would-otherwise-hunt-for
title: Hand the executor the interfaces it would otherwise hunt for
summary: "The key types and exports the executor needs are embedded in the plan, so it never explores the codebase to find them."
capability_tags:
  - plan-implementation
pattern_tags:
  - expand-contract
conditions_applies_when: A plan depends on existing code or creates interfaces other plans consume.
conditions_does_not_apply_when: "The plan is self-contained, is pure configuration, or every pattern is already established."
artifact_contract_output_type: interfaces-block
artifact_contract_required_data:
  - the interfaces the executor needs
  - the file each came from
artifact_contract_verified_by: the plan carries the interfaces and the executor needs no codebase exploration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-interface-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Hand the executor the interfaces it would otherwise hunt for
After determining `files_modified`, extract the key interfaces/types/exports from the codebase that executors will need
Embed these in the plan's `<context>` section as an `<interfaces>` block
Executor should use these directly — no codebase exploration needed
- Plan touches files that import from other modules → extract those module's exports
- Plan creates a new API endpoint → extract the request/response types
- Plan modifies a component → extract its props interface
- Plan depends on a previous plan's output → extract the types from that plan's files_modified
