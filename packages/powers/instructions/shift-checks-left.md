---
instruction_id: shift-checks-left
title: Shift the checks left
summary: Catch a problem as early in the pipeline as possible.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: You choose where a check runs.
conditions_does_not_apply_when: The check can only run at one point.
artifact_contract_output_type: gate-ordering
artifact_contract_required_data:
  - the order of the checks
  - the earliest stage each runs at
artifact_contract_verified_by: "static analysis runs before tests, tests before staging, staging before production"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 1
---

# Shift the checks left
**Shift Left:** Catch problems as early in the pipeline as possible. A bug caught in linting costs minutes; the same bug caught in production costs hours. Move checks upstream — static analysis before tests, tests before staging, staging before production.
