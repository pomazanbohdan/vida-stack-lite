---
instruction_id: sharpen-domain-language
title: Sharpen domain language
summary: "Sharpen the project's shared language: challenge conflicting terms, propose precise canonical words, stress-test with scenarios, cross-check with code, and record terms inline."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: "The project's domain terms are fuzzy, overloaded, or contradict the code."
conditions_does_not_apply_when: The language is already precise and recorded.
artifact_contract_output_type: updated-glossary
artifact_contract_required_data:
  - canonical terms
  - avoid list
  - contradictions surfaced
artifact_contract_verified_by: each resolved term is recorded at the moment it is resolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/domain-modeling/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-forge-idea/SKILL.md
status: active
revision: 2
---

# Sharpen domain language
Actively build and sharpen the project's domain model as you design. This is the *active* discipline: challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* the glossary for vocabulary is not this skill: that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)
### Challenge against the glossary
When the user uses a term that conflicts with the existing language in `GLOSSARY.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"
### Sharpen fuzzy language
When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account': do you mean the Customer or the User? Those are different things."
### Discuss concrete scenarios
When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.
### Cross-reference with code
When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"
### Update GLOSSARY.md inline
When a term is resolved, update `GLOSSARY.md` right there. Don't batch these up: capture them as they happen. `GLOSSARY.md` should be totally devoid of implementation details. Do not treat `GLOSSARY.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.
Do not assume the user's terms are precise.
When a term is fuzzy or overloaded, name the ambiguity and ask for a precise choice before continuing.
For example, do not let `user`, `buyer`, and `payer` collapse into one entity unless the idea actually requires that.
