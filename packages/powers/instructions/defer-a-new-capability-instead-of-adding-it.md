---
instruction_id: defer-a-new-capability-instead-of-adding-it
title: Defer a new capability instead of adding it
summary: "The scope boundary is fixed; a request for a new capability is recorded as deferred, not started."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The user asks for something that belongs to another unit of work.
conditions_does_not_apply_when: The request clarifies how the scoped work is to be done.
artifact_contract_output_type: deferred-item
artifact_contract_required_data:
  - the requested capability
  - the scope it was deferred to
artifact_contract_verified_by: the idea is recorded as deferred and no work was started on it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase-assumptions.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/default.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/advisor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Defer a new capability instead of adding it
The phase boundary comes from ROADMAP.md and is FIXED. Discussion clarifies HOW to implement what's scoped, never WHETHER to add new capabilities.
Capture the idea in a "Deferred Ideas" section. Don't lose it, don't act on it.
Heuristic: Does this clarify how we implement what's already in the phase, or does it add a new capability that could be its own phase?
