---
instruction_id: a-check-in-the-wrong-layer-does-not-close-the-threat
title: A check in the wrong layer does not close the threat
summary: "A mitigation is verified at the boundary it must protect, not merely found somewhere in the code."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A declared control is being verified as present in the implementation.
conditions_does_not_apply_when: The presence of the control is not in question and only its wiring is checked.
artifact_contract_output_type: control-verification
artifact_contract_required_data:
  - the threat vector the control addresses
  - the boundary where the control was found
artifact_contract_verified_by: the control sits on the boundary the threat vector crosses and is not only present somewhere in the tree
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-security-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-security-auditor.compact.md
status: active
revision: 1
---

# A check in the wrong layer does not close the threat
L2: verify the mitigation ADDRESSES the threat vector and is placed at the correct boundary (a check in the wrong layer does not close the threat).
L3: deep trace — follow the data flow end-to-end, check edge cases and ordering, confirm no bypass path exists.
