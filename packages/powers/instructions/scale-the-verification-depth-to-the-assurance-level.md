---
instruction_id: scale-the-verification-depth-to-the-assurance-level
title: Scale the verification depth to the assurance level
summary: "The level in force decides how deep the verification goes, and every accepted risk carries a written rationale."
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: A mitigation is being verified against a threat.
conditions_does_not_apply_when: The threat model declares no assurance level.
artifact_contract_output_type: assurance-verification
artifact_contract_required_data:
  - the level in force
  - the verification depth applied
  - the rationale for an accepted risk
artifact_contract_verified_by: the verification depth matches the level
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/security-asvs-levels.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Scale the verification depth to the assurance level
Higher levels are supersets of lower — L3 includes all L2 and L1 requirements
Verify each declared mitigation is PRESENT in the cited file (grep-level check — find the pattern, confirm the call exists)
Verify the mitigation ACTUALLY ADDRESSES the threat vector (not just that some pattern is present) and is placed at the correct trust boundary. A login check in the wrong layer does not close the threat
Deep verification — trace data flow end-to-end, check edge cases and ordering, confirm the mitigation cannot be bypassed via alternate code paths or parameter manipulation
Every `accept` MUST have explicit documented rationale explaining why the risk is tolerable for this specific context
