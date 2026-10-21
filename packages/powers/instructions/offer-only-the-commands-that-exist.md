---
instruction_id: offer-only-the-commands-that-exist
title: Offer only the commands that exist
summary: The offered commands are the ones that exist; a name that does not exist is never suggested.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - completion-criteria
conditions_applies_when: Options with commands are presented to the user.
conditions_does_not_apply_when: The option carries prose only and no command.
artifact_contract_output_type: option-list
artifact_contract_required_data:
  - the offered commands
  - the recommended one
artifact_contract_verified_by: every offered command is one of the listed commands
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/offer-next.md
status: active
revision: 1
---

# Offer only the commands that exist
Only suggest the commands listed above. Do not invent or hallucinate command names
