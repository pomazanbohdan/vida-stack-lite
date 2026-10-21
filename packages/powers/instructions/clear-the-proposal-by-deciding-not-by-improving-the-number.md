---
instruction_id: clear-the-proposal-by-deciding-not-by-improving-the-number
title: "Clear the proposal by deciding, not by improving the number"
summary: "A proposal is cleared by a recorded disposition; the metric moving does not clear it, because the cheap way to move it is to make the code worse."
capability_tags:
  - triage-reports
pattern_tags:
  - decision-trail
conditions_applies_when: A proposal has been raised and a decision about it is pending.
conditions_does_not_apply_when: No proposal is pending.
artifact_contract_output_type: disposition-record
artifact_contract_required_data:
  - the disposition
  - the reason
  - who decided
artifact_contract_verified_by: the proposal is cleared by the recorded decision and not by the number moving
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/act-on-a-refactor-proposal.md
status: active
revision: 1
---

# Clear the proposal by deciding, not by improving the number
**The score improving does not clear a proposal — only a disposition does.** This is deliberate. If clearing required the number to go down, the cheapest way to satisfy it would be splitting one coherent function into two incoherent ones: identical total complexity, worse cohesion. The gate asks whether you decided, not whether the metric moved.
