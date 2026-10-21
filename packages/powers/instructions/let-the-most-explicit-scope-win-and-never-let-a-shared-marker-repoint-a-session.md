---
instruction_id: let-the-most-explicit-scope-win-and-never-let-a-shared-marker-repoint-a-session
title: Let the most explicit scope win and never let a shared marker repoint a session
summary: The scope is resolved from the most explicit source down; a shared marker never overrides a session that has a scope of its own.
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: A session resolves which scope it is working in.
conditions_does_not_apply_when: Only one scope exists.
artifact_contract_output_type: scope-resolution
artifact_contract_required_data:
  - the source that won
  - the scope it named
artifact_contract_verified_by: the most explicit source decided the scope and no shared marker overrode a session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/workstream-flag.md
status: active
revision: 1
---

# Let the most explicit scope win and never let a shared marker repoint a session
A session that already has its own pointer (step 3) is never overridden by this step, even if that pointer is stale
A session that has never set its own pointer inherits
rather than silently falling back to flat mode
Clearing a workstream for one session removes only that session's pointer file
This returns that session to step 4 of Resolution Priority above — it goes back to **inheriting**
