---
instruction_id: treat-a-disabled-test-as-an-untested-requirement
title: Treat a disabled test as an untested requirement
summary: A requirement whose only test is skipped or disabled is not tested at all.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: The tests linked to a requirement are being audited.
conditions_does_not_apply_when: Every linked test is active.
artifact_contract_output_type: disabled-test-audit
artifact_contract_required_data:
  - the requirement
  - the disabled test
  - whether other active tests cover it
artifact_contract_verified_by: a requirement with only disabled tests is reported as a blocker
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verifier-phase-gates.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Treat a disabled test as an untested requirement
A disabled test linked to a requirement = requirement NOT tested
Critical if the disabled test is the only test proving that requirement
Important if other active tests also cover the requirement
