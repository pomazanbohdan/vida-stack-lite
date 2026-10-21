---
instruction_id: evolve-the-project-record-from-what-the-phase-learned
title: Evolve the project record from what the phase learned
summary: "After a phase the project record is rewritten: requirements that were delivered move to validated, requirements that turned out wrong move out of scope with their reason, and new ones are added."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A phase has been completed and the project record still describes the state before it.
conditions_does_not_apply_when: The project record is not maintained during the work.
artifact_contract_output_type: project-record
artifact_contract_required_data:
  - the requirements moved
  - the reason for each move
  - the decisions logged
  - the concerns kept
artifact_contract_verified_by: the record reflects the phase and every movement carries its reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/transition.md
status: active
revision: 1
---

# Evolve the project record from what the phase learned
Move to Validated with phase reference: `- ✓ [Requirement] — Phase X`
Move to Out of Scope with reason: `- [Requirement] — [why invalidated]`
Add to Active: `- [ ] [New requirement]`
Add to Key Decisions table with outcome if known
If the product has meaningfully changed, update the description
Keep it current and accurate
If addressed in this phase: Remove from list
If still relevant for future: Keep with "Phase X" prefix
Add any new concerns from completed phase's summaries
