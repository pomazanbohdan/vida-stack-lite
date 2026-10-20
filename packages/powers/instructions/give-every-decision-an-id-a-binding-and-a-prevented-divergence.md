---
instruction_id: give-every-decision-an-id-a-binding-and-a-prevented-divergence
title: "Give every decision an id, a binding and a prevented divergence"
summary: "Each decision that survives carries a stable id, states what it binds, the divergence it prevents and the rule a downstream unit must follow."
capability_tags:
  - design-structure
pattern_tags:
  - decision-trail
conditions_applies_when: Decisions are being collected into a contract that later work has to cite.
conditions_does_not_apply_when: The decisions stay in the conversation and are never written down.
artifact_contract_output_type: decision-entries
artifact_contract_required_data:
  - the stable id
  - the binding
  - the prevented divergence
  - the rule
artifact_contract_verified_by: every surviving decision carries all four parts and its id is stable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/assets/spine-template.md
status: active
revision: 1
---

# Give every decision an id, a binding and a prevented divergence
Each surviving decision becomes an `AD-n`
(stable ID, `Binds`/`Prevents`/`Rule`, `[ADOPTED]` when the user or existing reality already settled it)
a decision that lives only in a diagram still gets logged
for a decision, capture what it binds and the divergence it prevents
Include a dependency-direction diagram (who may depend on whom) — it IS a rule; author it as valid mermaid, never an empty graph.
