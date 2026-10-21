---
instruction_id: run-the-hard-stop-gates-before-you-route
title: Run the hard-stop gates before you route
summary: The validity gates run before any routing decision and the run stops at the first gate that fires; an explicit override skips them and says so.
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: The run is about to advance to the next step.
conditions_does_not_apply_when: The run only reports; it does not advance.
artifact_contract_output_type: gate-report
artifact_contract_required_data:
  - the gates that were checked
  - the first gate that fired
  - the override notice
artifact_contract_verified_by: no routing happens before the gates are checked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/next.md
status: active
revision: 1
---

# Run the hard-stop gates before you route
Run hard-stop checks before routing.
Exit on first hit.
Hard stop: Unresolved checkpoint
Hard stop: Project in error state
Hard stop: unchecked verification failures
An explicit override skips every gate.
