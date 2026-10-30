---
instruction_id: mark-a-behaviour-dependent-truth-unverified-until-a-test-exercises-it
title: Mark a behaviour-dependent truth unverified until a test exercises it
summary: A truth that depends on runtime behaviour is not counted as verified when no test exercises it; it is excluded from the score and routed to a human.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "A truth that depends on a state transition, a cleanup or an ordering invariant is being scored."
conditions_does_not_apply_when: A test exercises the behaviour and the truth is directly observed.
artifact_contract_output_type: behaviour-unverified
artifact_contract_required_data:
  - the behaviour-dependent truth
  - the field it is counted in
  - where it is routed
artifact_contract_verified_by: the behaviour-dependent truth was not counted as verified and was routed to a human
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/planning-artifacts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mark a behaviour-dependent truth unverified until a test exercises it
- it is excluded from `score`, counted in the `behavior_unverified` frontmatter field, and routed to `human_needed`, so a behaviour-dependent gap can no longer count toward a clean N/N.
