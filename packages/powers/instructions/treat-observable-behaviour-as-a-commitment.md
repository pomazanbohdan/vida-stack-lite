---
instruction_id: treat-observable-behaviour-as-a-commitment
title: Treat every observable behaviour as a commitment
summary: Every public behaviour of a surface becomes a de facto contract once a user depends on it.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: You design or change a surface other code can observe.
conditions_does_not_apply_when: The behaviour is internal and cannot be observed from outside.
artifact_contract_output_type: interface-commitment
artifact_contract_required_data:
  - the observable behaviours of the surface
  - which of them are intentional
artifact_contract_verified_by: every observable behaviour is either documented as a commitment or made unobservable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Treat every observable behaviour as a commitment
With a sufficient number of users of an API, all observable behaviors of your system will be depended on by somebody, regardless of what you promise in the contract.

This means: every public behavior — including undocumented quirks, error message text, timing, and ordering — becomes a de facto contract once users depend on it. Design implications:

- **Be intentional about what you expose.** Every observable behavior is a potential commitment.
- **Don't leak implementation details.** If users can observe it, they will depend on it.
- **Plan for deprecation at design time.**
- **Tests are not enough.** Even with perfect contract tests, Hyrum's Law means "safe" changes can break real users who depend on undocumented behavior.
