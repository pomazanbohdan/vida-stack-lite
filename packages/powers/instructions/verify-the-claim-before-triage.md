---
instruction_id: verify-the-claim-before-triage
title: Verify the claim before triage
summary: "Verify a reported claim before grilling it: reproduce a bug from the reporter's steps, or run the relevant tests for a change."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "A report's claim drives the triage decision."
conditions_does_not_apply_when: The claim is already confirmed.
artifact_contract_output_type: verification-result
artifact_contract_required_data:
  - reproduction
  - confirmed or failed
  - code path
artifact_contract_verified_by: "the outcome is confirmed, failed, or insufficient detail"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/triage/SKILL.md
status: active
revision: 1
---

# Verify the claim before triage
Before any grilling, check that the claim holds up. For a bug, reproduce it from the reporter's steps. For a PR, confirm the diff does what it claims: check it out, run the relevant tests or commands. Report what happened: confirmed (with code path), failed, or insufficient detail (a strong `needs-info` signal). A confirmed verification makes a much stronger agent brief.
