---
instruction_id: make-the-decision-reversible-rather-than-gate-it
title: Make the decision reversible rather than gate it
summary: "When a decision can be made reversible, the better move is to remove the irreversibility instead of inserting a gate in front of it."
capability_tags:
  - design-structure
pattern_tags:
  - prepared-reversal
conditions_applies_when: A decision has to be walked through and its irreversibility can be designed away.
conditions_does_not_apply_when: The decision cannot be made reversible and a gate is the only way through.
artifact_contract_output_type: reversibility-measure
artifact_contract_required_data:
  - the decision
  - the seam or adapter that makes it reversible
artifact_contract_verified_by: "the irreversibility was removed rather than gated, and the seam that does it is named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-reversibility.md
status: active
revision: 1
---

# Make the decision reversible rather than gate it
**Using the gate as a substitute for design.** The checkpoint buys deliberation on a door you must walk through. The better move, when available, is to *make the decision reversible* — put the format behind a writer seam, version the contract, keep the vendor call behind an adapter. Prefer removing the irreversibility over gating it.
Good architecture keeps decisions cheap to undo. The dangerous ones are the **one-way doors** — pick this storage format, expose this public contract, lock in this external service — where a wrong turn is not a refactor but a migration.
