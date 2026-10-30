---
instruction_id: cluster-ideas-into-distinct-directions
title: Cluster the ideas into distinct directions
summary: "After the user reacts to the expansion, cluster the ideas that resonated into two or three directions that differ in kind, not only in wording."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The user has reacted to the generated variations and the space has to be narrowed.
conditions_does_not_apply_when: No variations have been generated yet.
artifact_contract_output_type: direction-set
artifact_contract_required_data:
  - "2 to 3 directions"
  - the variations clustered into each direction
artifact_contract_verified_by: "each direction is meaningfully different from the others, not a variation on the same theme"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Cluster the ideas into distinct directions

After the user reacts to the expansion — indicating which ideas resonate, pushing back, adding context — shift to convergent mode:

**Cluster** the ideas that resonated into 2-3 distinct directions. Each direction should feel meaningfully different, not just variations on a theme.
