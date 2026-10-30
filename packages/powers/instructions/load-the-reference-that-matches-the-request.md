---
instruction_id: load-the-reference-that-matches-the-request
title: Load the reference that matches the request
summary: An action request loads its own reference; the general help is loaded only when a question arrives.
capability_tags:
  - consult-guidance
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A request arrives that maps to one of the known actions.
conditions_does_not_apply_when: The request is a plain question with no action behind it.
artifact_contract_output_type: advisor-answer
artifact_contract_required_data:
  - the reference that was loaded
  - the outcome of the action
artifact_contract_verified_by: the help section was not loaded before the action was finished
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body routes generic request types to reference material but identifies no substantive task domain; a domain label would depend on context outside the body and conditions.
---

# Load the reference that matches the request
When the request is only one of these actions, load its reference and follow it.
Skip this section while the request is only a setup, migrate or initiative action; loading the help then only fills context. If the user later asks a question or wants advice, come back and follow it.
