---
instruction_id: stop-the-turn-after-the-intent-is-confirmed
title: Stop the turn after the intent is confirmed
summary: "On an explicit yes, deliver the confirmed statement of intent, offer the downstream paths, and end the turn without starting any of them."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - requirements-clarification
conditions_applies_when: The user has confirmed the statement of intent with an explicit yes.
conditions_does_not_apply_when: "The intent is not yet confirmed, or the downstream step was already chosen and agreed."
artifact_contract_output_type: turn-handoff
artifact_contract_required_data:
  - the confirmed statement of intent
  - the downstream paths offered
  - the end of the turn
artifact_contract_verified_by: no tool was invoked and no downstream work started in the turn that carried the confirmation
compatibility_excludes: []
compatibility_requires:
  - require-an-explicit-yes-to-confirm-the-intent
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/interview-me/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Stop the turn after the intent is confirmed

When the user confirms the statement of intent with an explicit "yes":

1. **Deliver the confirmed Statement of Intent.**
2. **Offer downstream paths** (offer to save it to a document, draft a spec, or move to task planning after the spec).
3. **STOP YOUR TURN IMMEDIATELY.** Do NOT invoke tools or start downstream work in this turn. Hand control back to the user to choose the next step.
