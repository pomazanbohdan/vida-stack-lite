---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-blue-ocean-strategy-skill-md-09eb48b7-c02"
title: "wondelai-skills: skills/blue-ocean-strategy/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/blue-ocean-strategy/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/blue-ocean-strategy/SKILL.md\"}"
atom_ids:
  - blue-ocean-strategy-canvas
  - blue-ocean-uncontested-space
  - blue-ocean-value-innovation
atom_count: 3
atoms: "[{\"atom_id\":\"blue-ocean-strategy-canvas\",\"file_sha256\":\"6590043b43842bc6c8519a3bc84b6c2d4fc1bc7839cd213b855a1d04ca02863f\",\"content_sha256\":\"542c6cb465b523d141c377ae082cde6ba89c10bb8292dee3dff4233a967f954e\",\"file_bytes\":1404,\"body_bytes\":307},{\"atom_id\":\"blue-ocean-uncontested-space\",\"file_sha256\":\"17b57bd8635a3f1e0b20d44122ace5eb58866c3bb0ccc9fc9c04590b197a221f\",\"content_sha256\":\"9e444fc3baed2108157081d68e1957000e305477cdc5bdebc9ce15d6108e3a7a\",\"file_bytes\":1345,\"body_bytes\":238},{\"atom_id\":\"blue-ocean-value-innovation\",\"file_sha256\":\"7b025e8a5d71ef81b6b1754fe4fd8c3b5a42544980b1d305429b257fb92976b0\",\"content_sha256\":\"9504cb45ff3cad74561154d4b0d4d89cbeeb287ac05159edac8079b7ad9b4139\",\"file_bytes\":1296,\"body_bytes\":256}]"
carrier_sha256: 780f6cded49fe94fe938a83a8f59f42e88e83aec9db67f91aa159f6bcd7d526b
carrier_bytes: 4380
revision: 1
status: active
---
<!-- vpmodule:atom:begin blue-ocean-strategy-canvas -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: blue-ocean-strategy-canvas
title: Plot the strategy canvas
summary: "Plot competing factors against offering levels, compare curves, and identify factors to eliminate, reduce, raise or create."
capability_tags:
  - design-structure
pattern_tags:
  - working-backwards
conditions_applies_when: "Visualizing an industry's competing factors."
conditions_does_not_apply_when: A market with no identifiable competing factors.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - canvas
artifact_contract_verified_by: The canvas shows a divergent curve and names the ERRC opportunities.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/blue-ocean-strategy/SKILL.md; sha256=6fefda23f1673390476244db624ff0fe9c115a445d0a43728d5d5d310a8ae896; locator=skills/blue-ocean-strategy/SKILL.md#L61-L82"
status: active
revision: 1
---

# Plot the strategy canvas

Plot industry competing factors against offering levels for the product and competitors. Compare curves, then identify factors buyers do not value, opportunities to eliminate/reduce/raise/create, and buyer-experience pain; a divergent curve indicates potential blue-ocean space.
<!-- vpmodule:atom:end blue-ocean-strategy-canvas -->
<!-- vpmodule:atom:begin blue-ocean-uncontested-space -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: blue-ocean-uncontested-space
title: Create uncontested market space
summary: Seek a leap in buyer and company value rather than competing for share in an existing market.
capability_tags:
  - design-structure
pattern_tags:
  - working-backwards
conditions_applies_when: Choosing a market strategy or assessing competitive positioning.
conditions_does_not_apply_when: A commodity market where no value leap is possible.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The strategy creates demand and breaks the value-cost trade-off rather than matching rivals.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/blue-ocean-strategy/SKILL.md; sha256=6fefda23f1673390476244db624ff0fe9c115a445d0a43728d5d5d310a8ae896; locator=skills/blue-ocean-strategy/SKILL.md#L14-L17"
status: active
revision: 1
---

# Create uncontested market space

Create uncontested market space rather than competing for share in existing markets. Seek a leap in value for buyers and the company: value innovation creates demand and breaks the value-cost trade-off.
<!-- vpmodule:atom:end blue-ocean-uncontested-space -->
<!-- vpmodule:atom:begin blue-ocean-value-innovation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: blue-ocean-value-innovation
title: Break the value-cost trade-off
summary: "Eliminate or reduce over-served factors to cut cost, and raise or create factors to increase buyer value."
capability_tags:
  - design-structure
pattern_tags:
  - working-backwards
conditions_applies_when: Designing a value innovation.
conditions_does_not_apply_when: A choice between differentiation and low cost.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The strategy both lowers cost and raises buyer value.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/blue-ocean-strategy/SKILL.md; sha256=6fefda23f1673390476244db624ff0fe9c115a445d0a43728d5d5d310a8ae896; locator=skills/blue-ocean-strategy/SKILL.md#L47-L60"
status: active
revision: 1
---

# Break the value-cost trade-off

Pursue differentiation and low cost simultaneously: eliminate or reduce over-served factors to cut cost, and raise or create factors to increase buyer value. Seek a value leap that breaks the assumed value-cost trade-off.
<!-- vpmodule:atom:end blue-ocean-value-innovation -->