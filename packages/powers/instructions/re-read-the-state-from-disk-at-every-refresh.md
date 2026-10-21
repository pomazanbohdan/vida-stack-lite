---
instruction_id: re-read-the-state-from-disk-at-every-refresh
title: Re-read the state from disk at every refresh
summary: "Every time the status view is shown, the state is re-read from disk so that the changes made by the background agents are picked up."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A status view is re-rendered while other agents may be changing the state.
conditions_does_not_apply_when: The view is rendered once from a state that cannot change under it.
artifact_contract_output_type: refreshed-status
artifact_contract_required_data:
  - the state read from disk
  - the changes it shows
artifact_contract_verified_by: the state was re-read from disk at the refresh point
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/manager.md
status: active
revision: 1
---

# Re-read the state from disk at every refresh
Every time this step is reached, re-read state from disk to pick up changes from background agents:
Dashboard auto-refreshes when background work is active.
Dashboard refreshes pick up changes from background agents via disk state
Background agent completion triggers notification and dashboard refresh
