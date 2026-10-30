---
instruction_id: judge-a-check-for-circularity
title: Judge a check for circularity
summary: "Rank the checks by whether the code under test could make them pass, and keep at least one that an outside opinion decides."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: The set of checks that guards the project is being chosen or reviewed.
conditions_does_not_apply_when: There is a single check and it is external.
artifact_contract_output_type: constraint-ranking
artifact_contract_required_data:
  - each check and its class
  - the external constraint that is present
  - the circular ones
artifact_contract_verified_by: "at least one constraint is judged outside the project's own tests"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Judge a check for circularity

**Not all checks are equally circular.** Rank them by one question: can the agent make this pass by writing code that doesn't work?

- **External** — axe-core encodes WCAG, `osv-scanner` reads a vulnerability database, Lighthouse measures a real browser. The agent can't argue with these.
- **Project** — your lint rules, your layer boundaries. A human owns the file.
- **Suite** — your own tests. Most useful, and the only genuinely circular one.

A bar made entirely of the third kind is worth less than one with an outside opinion in it. Check that at least one external constraint is present.
