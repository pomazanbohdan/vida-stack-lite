---
instruction_id: hold-an-unwired-check-fail-closed
title: Hold an unwired check fail-closed
summary: "A check that is not wired yet reports as flagged or unverified, never as a silent pass."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A negative check has been declared but its mechanical check is not wired yet.
conditions_does_not_apply_when: The mechanical check exists and runs.
artifact_contract_output_type: unwired-check-report
artifact_contract_required_data:
  - the check that is declared
  - the state it is reported in
artifact_contract_verified_by: the check is reported as flagged or unverified and never as a pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-prohibition-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Hold an unwired check fail-closed
At verify time, a `test`-tier prohibition whose mechanical check is not yet wired is held **fail-closed** — it reports as flagged/unverified, never as a silent pass — so a prohibition can never quietly disappear between spec and verification.
A `judgment`-tier prohibition routes to a judgment-based review rather than a green/red test.
