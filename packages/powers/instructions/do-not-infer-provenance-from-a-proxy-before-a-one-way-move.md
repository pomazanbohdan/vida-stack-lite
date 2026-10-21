---
instruction_id: do-not-infer-provenance-from-a-proxy-before-a-one-way-move
title: Do not infer provenance from a proxy before a one-way move
summary: "A date is a proxy, not a fact; a wrong inference applied to a one-way move is silently irreversible."
capability_tags:
  - assess-change-impact
pattern_tags:
  - risk-first-ordering
conditions_applies_when: Records are about to be moved or grouped and their owner is not recorded.
conditions_does_not_apply_when: The owner of every record is recorded on disk.
artifact_contract_output_type: provenance-decision
artifact_contract_required_data:
  - the proxy that was refused
  - the grouping that was chosen instead
  - what the confirmation says about the grouping
artifact_contract_verified_by: no provenance was inferred from a proxy and the grouping is stated in the confirmation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/archive-quick-tasks-at-milestone-close.md
status: active
revision: 1
---

# Do not infer provenance from a proxy before a one-way move
Splitting tasks per milestone was considered and rejected
inferring provenance from dates (creation time vs. a milestone's shipped date) is a proxy, not a fact, and a wrong inference on a one-way `mv` is silently irreversible.
