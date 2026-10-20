---
instruction_id: offer-the-methods-and-stop-for-a-choice
title: Offer the methods and stop for a choice
summary: "A short menu of five methods that attack the target from different angles, with reshuffle, list all and proceed; the menu is offered again after each run."
capability_tags:
  - review-code
pattern_tags:
  - approval-policy
conditions_applies_when: A piece of work is to be deepened and the user chooses how.
conditions_does_not_apply_when: The method was named by the caller and there is nothing to choose.
artifact_contract_output_type: method-menu
artifact_contract_required_data:
  - the five methods offered
  - the choice the user made
  - the next menu after the run
artifact_contract_verified_by: the menu offers five methods from different angles and the run stops for the choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-advanced-elicitation/SKILL.md
status: active
revision: 1
---

# Offer the methods and stop for a choice
pick the 2–4 categories that fit the target (risk before a launch, technical for code, collaboration when stakeholders compete, creative when the content is flat)
hand-pick five methods that attack the target from different angles
HALT and give the user a choice:
The five offered methods, listed by name. The user may pick one or several.
Reshuffle — replace the list with five new options.
List all — show the full catalog with descriptions.
Proceed — no further elicitation.
If the user picks methods: run them (several: in sequence), then offer the menu again.
If the user chooses Proceed: done. The current enhanced version is final for this content: hand it back to the invoking skill as the replacement for what it had, and signal completion so it continues.
Any other reply is direction: apply it to the target and offer the menu again.
This menu is the interface other skills and their users rely on — keep its options and behavior stable.
