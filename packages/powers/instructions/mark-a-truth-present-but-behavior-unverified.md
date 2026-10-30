---
instruction_id: mark-a-truth-present-but-behavior-unverified
title: Mark a truth present but behaviour-unverified
summary: "A truth that is present and wired but never exercised by a test is marked as such, excluded from the score and sent to a human."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A truth was found present but no test exercises its behaviour.
conditions_does_not_apply_when: A test exercises the behaviour of the truth.
artifact_contract_output_type: behaviour-unverified-record
artifact_contract_required_data:
  - the truth
  - the test that would exercise it
  - the expected state afterwards
artifact_contract_verified_by: "the truth is marked behaviour-unverified, excluded from the score and routed to a human"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/verification-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mark a truth present but behaviour-unverified
`⚠️ PRESENT_BEHAVIOR_UNVERIFIED` — present + wired, but a state transition or cancellation/cleanup/ordering invariant was not exercised by any test.
Counts toward `behavior_unverified`, routes to human verification, and is *excluded* from the verified score.
