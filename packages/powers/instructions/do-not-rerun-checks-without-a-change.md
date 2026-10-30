---
instruction_id: do-not-rerun-checks-without-a-change
title: Do not rerun checks without a change
summary: Run a check once after the change that could affect it; repeating the same command on unchanged code adds no confidence.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check has just passed and the temptation is to run it again.
conditions_does_not_apply_when: The code changed since the last run of the same check.
artifact_contract_output_type: check-run
artifact_contract_required_data:
  - the command
  - the change it was run after
  - the result
artifact_contract_verified_by: every run follows a change that could affect the result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/test-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not rerun checks without a change
Run each test command after a change that could affect the result. After a clean run, don't repeat the same command unless the code has changed since — re-running on unchanged code adds no confidence.

## Red Flags

- Running the same test command twice in a row without any intervening code change

## Common Rationalizations

"Let me run the tests again just to be extra sure"
After a clean test run, repeating the same command adds nothing unless the code has changed since. Run again after subsequent edits, not as reassurance.
