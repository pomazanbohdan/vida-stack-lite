---
instruction_id: never-drop-a-surfaced-item-silently
title: Never drop a surfaced item silently
summary: Every surfaced item is either written into the plan or surfaced as a flagged assumption; none is dismissed on the fly.
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A probe or a classification pass has surfaced a set of items.
conditions_does_not_apply_when: Nothing was surfaced.
artifact_contract_output_type: surfaced-item-ledger
artifact_contract_required_data:
  - the surfaced items
  - the ones written into the plan
  - the ones flagged as assumptions
artifact_contract_verified_by: the number surfaced equals the number authored plus the number flagged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/specless-probe-fallback.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/ui-consideration-probe.md
status: active
revision: 1
---

# Never drop a surfaced item silently
for each section, (# probe-surfaced items) == (# authored into `must_haves` + # surfaced as flagged assumptions)
**Never auto-dismiss** (a wrong dismissal is the exact silent failure this eliminates)
never a silent drop, never a guessed kind
