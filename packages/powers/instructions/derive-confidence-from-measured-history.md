---
instruction_id: derive-confidence-from-measured-history
title: Derive confidence from measured history
summary: "A confidence value comes from the measured ratio of estimate to actual in this project, not from the agent's own certainty."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: An estimate and a confidence are produced for a piece of work.
conditions_does_not_apply_when: "The value is a measurement, not an estimate."
artifact_contract_output_type: calibrated-estimate
artifact_contract_required_data:
  - the raw estimate
  - the measured factor
  - the derived confidence
  - the sample count behind it
artifact_contract_verified_by: the confidence comes from the measured history and not from a self-assessment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/context-budget.md
status: active
revision: 1
---

# Derive confidence from measured history
confidence is **derived, not judged**: it is the `confidence` value from the same calibration query, keyed to the sample count
Do not rate your own certainty.
Self-rated confidence was measured in this project and found weak
every signal here routes on measured history instead.
multiply your raw figure by its `factor`. It is the measured estimate-vs-actual ratio for THIS project
