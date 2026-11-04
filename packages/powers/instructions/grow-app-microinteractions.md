---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-microinteractions
title: Polish the micro-moments
summary: "Model Trigger, Rules, Feedback and Loops for each frequent interaction; keep feedback under 100ms for direct manipulation, map empty, loading, partial, error, disabled and double-tap states and ship one signature moment that passes the removal test."
capability_tags:
  - design-retention-engine
pattern_tags:
  - microinteraction-feedback
conditions_applies_when: Polishing the most-used interactions.
conditions_does_not_apply_when: A screen with no repeated interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Five interactions have missing states and fixes, and the signature moment is chosen and implemented."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L165-L181"
status: active
revision: 1
---

# Polish the micro-moments

For each microinteraction, model Trigger → Rules → Feedback → Loops & Modes. Feedback must be immediate, under 100 ms for direct manipulation, and proportionate; animate the touched element rather than using a separate toast. Map empty, loading, partial, error, disabled and double-tap states. Invest in one or two signature moments that pass the removal test, and use long loops to retire hints for power users. Audit the five most-used interactions, identify missing edge states and implement one signature moment in real code. Ask the user which five to audit, which becomes signature and which edge states to implement first. Record inventory, fixes and statuses in DESIGN.md and update tracker. Done when five interactions, missing states/fixes and chosen signature moment are recorded and each fix has status.
