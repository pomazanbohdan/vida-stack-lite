---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-cold-start-problem-skill-md-0af1836d-c01"
title: "wondelai-skills: skills/cold-start-problem/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/cold-start-problem/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/cold-start-problem/SKILL.md\"}"
atom_ids:
  - cold-start-problem-apply
  - cold-start-problem-atomic-network
  - cold-start-problem-ceiling
  - cold-start-problem-common-mistakes
  - cold-start-problem-core
  - cold-start-problem-diagnostic
  - cold-start-problem-effects
  - cold-start-problem-hard-side
atom_count: 8
atoms: "[{\"atom_id\":\"cold-start-problem-apply\",\"file_sha256\":\"755b52e7dc05363d65c314f18051dfac65ffe881c63376e0c9b76016d0f608d4\",\"content_sha256\":\"311dadaf22c64b650a02602d9e45611584e896bfbbd48a537cb8feaa3933bea7\",\"file_bytes\":1430,\"body_bytes\":335},{\"atom_id\":\"cold-start-problem-atomic-network\",\"file_sha256\":\"52df09ec2a689ceb5612a32ce004a7c3e902215245069b6a90fe505fa6fa21b8\",\"content_sha256\":\"c95921007826cd25d53ad5e12b44db48b07648a20eee6b19c41cb2ba30a69e2a\",\"file_bytes\":1894,\"body_bytes\":801},{\"atom_id\":\"cold-start-problem-ceiling\",\"file_sha256\":\"c4623c84de7a1239d65a476cf49fa34ab88929c4b9f0c1c7ea0d6a00eb9c3e5e\",\"content_sha256\":\"28f161fa72e81278266e63f03b3e1db1fe6b5bdb6fa5bf4122b9c4b4a86ea17b\",\"file_bytes\":2021,\"body_bytes\":857},{\"atom_id\":\"cold-start-problem-common-mistakes\",\"file_sha256\":\"c966b7605187b9f6aa8817f450db6058a70b422c5640930dee353361ff0136b7\",\"content_sha256\":\"8be555c06819089911bcdbaf38879b39a0d3144b095064850dc3a9d56610b584\",\"file_bytes\":1891,\"body_bytes\":750},{\"atom_id\":\"cold-start-problem-core\",\"file_sha256\":\"310ca6e797ca0219226e3f8b18dda5797aa920a48b5920c7ba84839d00d1f41c\",\"content_sha256\":\"cc743a44c5ca4c9732293905b74d279f454f2c03a7383ce43e4237be8a658ffb\",\"file_bytes\":1470,\"body_bytes\":379},{\"atom_id\":\"cold-start-problem-diagnostic\",\"file_sha256\":\"f4e96fe849763eb0658bcf8dbe38d2727a91516438eac10c4b92ef702835f357\",\"content_sha256\":\"241cb8518be0363d1f121026dd0207241f14b23dcec27b4e736b75fd85511b44\",\"file_bytes\":2095,\"body_bytes\":837},{\"atom_id\":\"cold-start-problem-effects\",\"file_sha256\":\"4eaf7418df7ce98d5637a28bde68b2fa6b9dcb810fe4f92308ae59254f9b6960\",\"content_sha256\":\"b60c31e7c9050a841cbae39391ceaa56fc2921d58cbd8f93815e70f00c18b15b\",\"file_bytes\":1883,\"body_bytes\":780},{\"atom_id\":\"cold-start-problem-hard-side\",\"file_sha256\":\"e432918c0defc8251af4e7a10562a282faf9ee16dea1ede0beff095ed69fefa7\",\"content_sha256\":\"884adc4e97222e33d8dd92a5d180a41880b9ee0f4f8f11ad574c667f22e26e6b\",\"file_bytes\":1779,\"body_bytes\":682}]"
carrier_sha256: 1c861001ac12678a1cc8f18d56a24b6ca891ba0cfb9fd6c7217a8cfe6aec554d
carrier_bytes: 15372
revision: 1
status: active
---
<!-- vpmodule:atom:begin cold-start-problem-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-apply
title: Apply the cold-start framework to a networked product
summary: "Use the framework to launch products whose value depends on other users: marketplaces, social, messaging and collaboration products."
capability_tags:
  - design-network-effects
pattern_tags: []
conditions_applies_when: Launching or growing a networked product.
conditions_does_not_apply_when: A single-user utility with no network dependency.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan names the network dependency and the stage it is in.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L10-L13"
status: active
revision: 1
---

# Apply the cold-start framework to a networked product

For products whose value depends on other users (including marketplaces, social, messaging, and collaboration products), use this framework to launch and scale by sequencing growth network by network through cold start, tipping point, escape velocity, ceiling, and moat stages.
<!-- vpmodule:atom:end cold-start-problem-apply -->
<!-- vpmodule:atom:begin cold-start-problem-atomic-network -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-atomic-network
title: Choose the atomic network
summary: "Choose the smallest stable, self-sustaining group of the right people that delivers core value and returns on its own; choose a network, not a market."
capability_tags:
  - design-network-effects
pattern_tags:
  - atomic-network
conditions_applies_when: Selecting the first network.
conditions_does_not_apply_when: A broad-market launch.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The atomic network names who, where and how many, and delivers core value unaided."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L53-L77"
status: active
revision: 1
---

# Choose the atomic network

Choose the smallest stable, self-sustaining group of the right people that delivers core value and returns on its own; choose a network rather than a broad market and build for that group even if the niche appears unscalable. Find the minimum working size, constrain the first network enough to achieve density with founder-level effort, define and instrument its magic moment, and gate every expansion on networks reaching that moment. A complete small network proves a replicable loop; scattered partial usage does not. Manually supply missing content, inventory, or matchmaking with real work until the network stands alone; never fabricate users, reviews, or activity that deceives participants. Niche products may look like toys because density is the cost of focus.
<!-- vpmodule:atom:end cold-start-problem-atomic-network -->
<!-- vpmodule:atom:begin cold-start-problem-ceiling -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-ceiling
title: Meet the ceiling with a new network or a moat
summary: "Expect growth to stall in successive S-curves against saturation, channel decay, hard-side revolt or quality collapse; start a new geography, segment or use case, or extend the moat."
capability_tags:
  - design-network-effects
pattern_tags:
  - network-ceiling
  - network-moat
conditions_applies_when: Responding to a growth plateau.
conditions_does_not_apply_when: A pre-launch product with no growth curve.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan names the stall signal and the chosen new network or moat.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L128-L153"
status: active
revision: 1
---

# Meet the ceiling with a new network or a moat

Expect growth to stall in successive S-curves against market saturation, channel decay, hard-side revolt, or quality collapse. Start a new geography, segment, use case, or product curve before the current one flattens; plan the next channel while the current channel still works. Watch take-rate complaints, multi-homing, and organized protest because the hard side may leave first. Fund curation, ranking, verification, spam controls, and sub-grouping as growth work at scale. Defend dense niches by over-serving them against cherry-picking rivals. Bundling may distribute to the easy side but rarely wins hard-side loyalty or depth. Diagnose which ceiling hit first per network, invest in trust and quality, address user-rooted causes of revolts and spam, and do not silence legitimate grievances with PR.
<!-- vpmodule:atom:end cold-start-problem-ceiling -->
<!-- vpmodule:atom:begin cold-start-problem-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-common-mistakes
title: Avoid the listed cold-start mistakes
summary: "Avoid broad launches, counting signups instead of density, treating both sides equally, big-bang launches and the other listed mistakes, and apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a networked-product launch for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L154-L166"
status: active
revision: 1
---

# Avoid the listed cold-start mistakes

Avoid launching to a broad market instead of one atomic network; counting signups instead of density; treating both sides equally; big-bang launches; faking scarcity or activity; cloning network two before network one is stable; assuming network effects strengthen forever; and ignoring cherry-picking rivals. Instead saturate one atomic network, measure weekly active networks, fill rate, and time-to-match, build product and economics for the hard side, tip network by network with a repeatable playbook, do honest manual work while keeping invite scarcity real, gate expansion on magic-moment and retention bars, fund quality/trust/curation, and over-serve dense niches while defending hard-side economics.
<!-- vpmodule:atom:end cold-start-problem-common-mistakes -->
<!-- vpmodule:atom:begin cold-start-problem-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-core
title: Treat network effects as an initial liability
summary: "An empty network is useless although a dense network is powerful; build one tiny, complete, self-sustaining network before expanding."
capability_tags:
  - design-network-effects
pattern_tags:
  - atomic-network
conditions_applies_when: Choosing the first network.
conditions_does_not_apply_when: A product whose value does not depend on other users.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The first network is small, complete and self-sustaining."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L14-L17"
status: active
revision: 1
---

# Treat network effects as an initial liability

Treat network effects as an initial liability: an empty network is useless although a dense network can be powerful. Build one tiny, complete, self-sustaining network at a time; solve its hard side first, then use a repeatable playbook to tip adjacent networks until the market follows, rather than launching broadly to a market.
<!-- vpmodule:atom:end cold-start-problem-core -->
<!-- vpmodule:atom:begin cold-start-problem-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-diagnostic
title: Run the cold-start diagnostic
summary: "Check whether the first atomic network is named by who, where and how many; the magic moment is instrumented; the hard side is solved; density is measured; and a tipping playbook exists, and apply the matching action."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a networked-product launch.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L167-L179"
status: active
revision: 1
---

# Run the cold-start diagnostic

Diagnose a launch by asking whether the first atomic network can be named by who, where, and how many; the magic moment is defined and instrumented; the hard side and its retention reasons are known; the first user receives value; a written next-network playbook exists; fill rate and time-to-match are measured; the first likely ceiling is known; and the hard side is defended from rivals. For each 'no', constrain the network until self-sustaining; define, measure per network, and gate on the magic moment; map money/status/utility and build for the hard side; add single-player tool value or manually fill the gap; codify invites, subsidies, and seeding from launch one; add per-network density metrics; model saturation, CAC creep, and quality decay; and deepen hard-side economics and pro tooling.
<!-- vpmodule:atom:end cold-start-problem-diagnostic -->
<!-- vpmodule:atom:begin cold-start-problem-effects -->
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
<!-- vpmodule:atom:end cold-start-problem-effects -->
<!-- vpmodule:atom:begin cold-start-problem-hard-side -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cold-start-problem-hard-side
title: Solve the hard side first
summary: "Identify the hard side by disproportionate work and difficulty attracting and retaining it, not by money paid, and understand its motivation before scaling."
capability_tags:
  - design-network-effects
pattern_tags:
  - hard-side
conditions_applies_when: Choosing which side of the network to solve first.
conditions_does_not_apply_when: A single-sided network.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The hard side is named with its motivation and acquisition evidence.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cold-start-problem/SKILL.md; sha256=6ee3a73a0ab3c0e0c70c75c1c36222cbca418e3c4fbfec75130f99079683af29; locator=skills/cold-start-problem/SKILL.md#L78-L102"
status: active
revision: 1
---

# Solve the hard side first

Identify the hard side by disproportionate work and difficulty attracting and retaining it, not by money paid; understand whether its motivation is money, status, or utility and build its product and economics first. The easy side arrives after the hard side delivers value. A useful single-player tool can recruit hard-side users before a network exists. Build pro workflows for the hard side and a clean consumer experience for the easy side; recruit and subsidize scarce supply early, disclose the subsidy taper, and do not quietly degrade livelihood terms. Plan power tools, analytics, and payout improvements by month three rather than year three.
<!-- vpmodule:atom:end cold-start-problem-hard-side -->