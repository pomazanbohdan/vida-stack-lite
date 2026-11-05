---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-quick-diagnostic
title: Run the microinteraction diagnostic
summary: "Audit eight questions covering trigger discoverability, trigger state, rule predictability, immediate feedback, feedback scale, evolution over time, unnecessary modes and first-time learnability, with a named action for every no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a microinteraction.
conditions_does_not_apply_when: A full scored audit.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L189-L203"
status: active
revision: 1
---

# Run the microinteraction diagnostic

Quick Diagnostic: audit any microinteraction against 8 questions, each with an If-No diagnosis and a mandatory Action. (1) Is there a clear, discoverable trigger? If no -- users cannot initiate the interaction; action: add a visible control or affordance. (2) Does the trigger show its current state? If no -- users cannot tell if it is on, off, or loading; action: add distinct visual states for every trigger state. (3) Are the rules simple and predictable? If no -- users are confused by what happened; action: simplify rules and match platform conventions. (4) Is there immediate feedback? If no -- users question whether their action worked; action: add visual response within 100ms. (5) Does feedback match the event's significance? If no -- small actions feel dramatic or big results feel trivial; action: scale feedback to event importance. (6) Does the interaction evolve over time? If no -- power users still see beginner hints; action: add progressive reduction through long loops. (7) Is the interaction free of unnecessary modes? If no -- users perform the wrong action in the wrong mode; action: remove modes or make the current mode highly visible. (8) Could a first-time user figure it out without help? If no -- the interaction needs explanation; action: simplify or add a one-time hint via long loop. This 8-row table is the scoring denominator referenced by the scoring instruction.
