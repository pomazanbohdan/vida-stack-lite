---
instruction_id: tell-a-stale-index-apart-from-a-running-or-failed-producer
title: Tell a stale index apart from a running or failed producer
summary: "A stale marker says only how old a derived artifact is; the producer state is reported separately so that old, in-flight and failed are not read as the same thing."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A derived artifact is consumed while its producer may still be running or may have failed.
conditions_does_not_apply_when: The producer state is not observable and only the age of the artifact is known.
artifact_contract_output_type: producer-state
artifact_contract_required_data:
  - the age of the artifact
  - the state of its producer
artifact_contract_verified_by: the report distinguishes an artifact that is merely old from one whose producer is running or failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-graphify-auto-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tell a stale index apart from a running or failed producer
The existing `stale: true` annotation tells the consumer the mtime is old; it cannot tell the consumer whether the auto-build hook has been running, just failed, or is in flight.
The hook writes `status: "running"` synchronously **before** detach, so the next planner invocation can see the in-flight signal even if `graphify update .` has not finished.
The file-missing case is silent (the operator either has not opted in or has not yet triggered a HEAD-advancing git op since enabling).
