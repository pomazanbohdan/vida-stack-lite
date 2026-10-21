---
instruction_id: state-that-a-destructive-flag-deletes-without-confirmation
title: State that a destructive flag deletes without confirmation
summary: "The removal prompts for nothing and a data flag deletes straight away, so the caller has to be sure before passing it."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - control-tiering
conditions_applies_when: A removal with a data flag is about to be run.
conditions_does_not_apply_when: The removal prompts and waits for a confirmation.
artifact_contract_output_type: destructive-action-disclosure
artifact_contract_required_data:
  - what the flag deletes
  - whether a confirmation is asked for
artifact_contract_verified_by: the disclosure states that the deletion happens without a confirmation step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/remove-a-capability.md
status: active
revision: 1
---

# State that a destructive flag deletes without confirmation
Removal is permanent within the current install.
`--purge-data` likewise deletes the capability's data directly, with no confirmation step — so be sure before you pass it.
