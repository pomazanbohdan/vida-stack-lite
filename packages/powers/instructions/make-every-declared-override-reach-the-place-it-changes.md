---
instruction_id: make-every-declared-override-reach-the-place-it-changes
title: Make every declared override reach the place it changes
summary: "Every declared value has to reach the place it changes, a value that is declared and hardcoded makes every override a silent no-op, and a switch means the author never decided."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A value can be overridden by whoever installs or uses the tool.
conditions_does_not_apply_when: Nothing in the tool can be changed without editing it.
artifact_contract_output_type: override-contract
artifact_contract_required_data:
  - the declared values
  - the place each one reaches
  - the values a team would want to change
artifact_contract_verified_by: "no declared value is hardcoded in the body, and every value a team would change is declared"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-customization.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/standards.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/skill-creator-loop.md
status: active
revision: 1
---

# Make every declared override reach the place it changes
The bar: every declared value reaches the place it changes; every value a team would override is declared.
Declared and hardcoded: the table declares a scalar the body hardcodes. Important; every override is a silent no-op.
Not resolved: no resolution call in activation, or tokens naming no key. Important; overrides never reach the model.
Boolean toggles:
- one minor, three or more important; a switch means the author never decided
The customization decision: does a team need to swap a rule or step without forking?
