---
instruction_id: offer-the-next-step-until-the-user-says-they-are-done
title: Offer the next step until the user says they are done
summary: After the work the next step is offered and the loop repeats until the user says they are finished.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A deliverable has been completed.
conditions_does_not_apply_when: The user has already said they are done.
artifact_contract_output_type: next-step-offer
artifact_contract_required_data:
  - the next step that was offered
  - the answer the user gave
artifact_contract_verified_by: the next step was offered and the loop continued until the user indicated they were done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/copilot-instructions.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Offer the next step until the user says they are done
After completing any command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting; repeat this feedback loop until the user explicitly indicates they are done.
