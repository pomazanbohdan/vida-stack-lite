---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-effects
title: "Analyze acquisition, engagement and economic effects"
summary: "Analyze the network through acquisition (the network brings users), engagement (more users improve session value) and economic (density improves unit economics)."
capability_tags:
  - design-network-effects
pattern_tags: []
conditions_applies_when: "Assessing a network's effects."
conditions_does_not_apply_when: A product with no user-to-user interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each of the three effects is assessed with evidence.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L30-L52"
status: active
revision: 1
---

# Analyze acquisition, engagement and economic effects

Analyze a networked product through acquisition (the network brings users), engagement (more users improve session value), and economic (density improves monetization and unit economics) effects, which can vary independently. Measure active, relevant connections and density rather than node counts or aggregate totals; anti-network effects compound emptiness in sparse networks, and cut every metric by sub-network such as city, team, or category. Treat the network as the moat and map products as networks of networks (for example, a marketplace by city-category). Separate the three effects in growth diagnosis and use per-network measures such as weekly active networks, viral factor, session frequency, and conversion.
