---
instruction_id: write-the-design-as-two-peer-documents
title: Write the design as two peer documents
summary: "One document owns how it looks, the other owns how it works, and the second references the first tokens by name; both win on conflict with any mock, wireframe or import."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - two-spine-contract
conditions_applies_when: A design is written as a contract for downstream consumers.
conditions_does_not_apply_when: The design is a single page or a throwaway prototype.
artifact_contract_output_type: design-pair
artifact_contract_required_data:
  - the visual identity document
  - the experience document
  - the token references between them
artifact_contract_verified_by: every token reference resolves by name and both documents state that they win on conflict
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Write the design as two peer documents
Produce two peer contracts: `DESIGN.md` (visual identity — owns *how it looks*) and `EXPERIENCE.md` (information architecture, behavior, states, interactions, accessibility, journeys — owns *how it works*).
EXPERIENCE.md cross-references DESIGN.md tokens by name using `{path.to.token}` syntax.
Both spines win on conflict with any mock, wireframe, or import.
