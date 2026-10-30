---
instruction_id: give-the-session-an-outside-voice
title: Give the session an outside voice
summary: "Every turn carries one real voice and one invented outside voice, used in character to find the sharper objection; the session is not a panel debate."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: An idea has to be pressure-tested from more than one angle.
conditions_does_not_apply_when: The pressure test needs one voice and one point of view only.
artifact_contract_output_type: adversarial-dialogue
artifact_contract_required_data:
  - the voices used
  - the objection each one raised
  - the question that came out of it
artifact_contract_verified_by: the session stays a pressure test and does not become a panel performance
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-forge-idea/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-advanced-elicitation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Give the session an outside voice
Each turn uses two voices:
One available persona — choose an installed agent or user-defined persona whose expertise fits the current branch. Vary this voice every few turns; do not let one voice dominate.
One generated persona — create a fresh outside voice, such as a competitor, buyer, finance reviewer, domain expert, or critic. Give it a name and enough characterization to keep its viewpoint distinct.
If no pool is available, generate this voice yourself.
Use these voices in character to pressure-test the current branch: find sharper objections, missing assumptions, and stronger defenses.
Cross-examine them for what matters, then synthesize their input into your next question.
Do not let the session turn into a panel debate or persona performance.
Voice the personas yourself by default. Spawn separate agents only when a branch needs independent reasoning that should not be influenced by one shared voice.
If neither yields a fit, invent named viewpoints suited to the content.
