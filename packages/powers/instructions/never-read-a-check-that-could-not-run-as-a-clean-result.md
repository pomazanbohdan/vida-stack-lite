---
instruction_id: never-read-a-check-that-could-not-run-as-a-clean-result
title: Never read a check that could not run as a clean result
summary: "A check that could not run and a check that ran and found nothing are different outcomes; the first is reported, the second passes."
capability_tags:
  - harden-validation
pattern_tags:
  - empty-result-policy
conditions_applies_when: A check inside a working step can fail to run without failing the step.
conditions_does_not_apply_when: The check ran and produced a verdict.
artifact_contract_output_type: check-outcome
artifact_contract_required_data:
  - whether the check ran
  - the outcome of the check
artifact_contract_verified_by: a check that could not run is reported as such and never as a clean result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/declare-a-hook-crash-policy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never read a check that could not run as a clean result
**crash() covers your hook's own bugs. It does not cover the more common defect: a check inside a *working* hook that silently reads "could not run" as if it were "ran, found nothing"** — passing every case it should have inspected.
a `try { ... } catch { /* silently pass */ }` around a check is the shape to be suspicious of, whether or not it happens to route through `hook-exit.js` at all.
