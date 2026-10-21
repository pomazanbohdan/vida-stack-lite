---
instruction_id: a-near-cap-warning-means-less-margin-not-a-failure
title: "A near-cap warning means less margin, not a failure"
summary: "An advisory warning on an otherwise green run says exactly that: the run finished, with less margin than the gate assumes it has."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A run finished and an advisory signal reported that it came close to a limit.
conditions_does_not_apply_when: The run failed.
artifact_contract_output_type: margin-warning
artifact_contract_required_data:
  - the signal
  - the elapsed time
  - the cap
artifact_contract_verified_by: the warning is read as reduced margin and the run is not called a failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/read-ci-timeout-signals.md
status: active
revision: 1
---

# A near-cap warning means less margin, not a failure
A near-cap warning on an otherwise-green run means exactly what it says: this run finished, but with less margin than the headroom-factor gate assumes it has.
