---
instruction_id: continue-the-register-numbering-after-the-existing-entries
title: Continue the register numbering after the existing entries
summary: New entries in a shared register continue after the highest number already in use; they never restart the sequence.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - stable-identity
conditions_applies_when: A plan adds an entry to a register that earlier plans in the same phase already filled.
conditions_does_not_apply_when: The register is empty.
artifact_contract_output_type: register-entry
artifact_contract_required_data:
  - the highest number in use
  - the new number
artifact_contract_verified_by: the new number continues the sequence and no existing number is reused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-gap-closure.md
status: active
revision: 1
---

# Continue the register numbering after the existing entries
read the `<threat_model>` blocks of the phase's existing plan files and continue after their highest `T-{phase}-NN` — do not renumber from `T-{phase}-01`
Every ID already names a specific threat in an earlier plan; reusing it makes
