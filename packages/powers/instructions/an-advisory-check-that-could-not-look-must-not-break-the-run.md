---
instruction_id: an-advisory-check-that-could-not-look-must-not-break-the-run
title: An advisory check that could not look must not break the run
summary: "A diagnostic that cannot run reports nothing and lets the run continue; it never fails the run it observes, and its silence carries no claim either way."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: An advisory or diagnostic check cannot run because its input could not be read.
conditions_does_not_apply_when: The check is a gate that certifies a result and can block the run.
artifact_contract_output_type: degraded-diagnostic
artifact_contract_required_data:
  - what the check could not read
  - what it reported instead
  - the run it observed
artifact_contract_verified_by: the check reported nothing and the run it observes was not failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/interpret-install-shadow-warnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# An advisory check that could not look must not break the run
the check itself could not run, and its silence carries no claim either way
it degrades to no report rather than crashing your install
