---
instruction_id: bound-every-detection-probe
title: Bound every detection probe
summary: "A probe without a timeout is a named defect: every detection is bounded."
capability_tags:
  - verify-work-results
pattern_tags:
  - resource-bounds
conditions_applies_when: A probe is declared to find out whether something is present.
conditions_does_not_apply_when: The check is a plain read with no probe.
artifact_contract_output_type: probe-declaration
artifact_contract_required_data:
  - the probe kind
  - the timeout it is bounded by
artifact_contract_verified_by: every probe declares a bound and no probe runs unbounded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/ship-a-reviewer-lane.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound every detection probe
**Every probe is bounded.** An unbounded `--help | grep` probe is a named defect in this repo.
`http-reachable` requires `timeoutMs`; so does `command-capability`, the probe kind you use when a bare binary name is ambiguous.
