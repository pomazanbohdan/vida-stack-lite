---
instruction_id: match-the-language-of-the-session
title: Match the language of the session
summary: The refinement is written in the communication language of the surrounding session.
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A result is handed back into a running session.
conditions_does_not_apply_when: The result goes to a store with a fixed language of its own.
artifact_contract_output_type: language-matched-result
artifact_contract_required_data:
  - the language of the session
  - the language of the result
artifact_contract_verified_by: the result uses the communication language of the surrounding session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-advanced-elicitation/SKILL.md
status: active
revision: 1
---

# Match the language of the session
Work in the surrounding session's communication language.
