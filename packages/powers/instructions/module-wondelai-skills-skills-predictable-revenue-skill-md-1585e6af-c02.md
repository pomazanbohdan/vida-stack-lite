---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-predictable-revenue-skill-md-1585e6af-c02"
title: "wondelai-skills: skills/predictable-revenue/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/predictable-revenue/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/predictable-revenue/SKILL.md\"}"
atom_ids:
  - predictable-revenue-efficiency
  - predictable-revenue-follow-up
  - predictable-revenue-handoff
  - predictable-revenue-hiring
  - predictable-revenue-icp
  - predictable-revenue-lagging-indicators
  - predictable-revenue-lead-types
  - predictable-revenue-leading-indicators
atom_count: 8
atoms: "[{\"atom_id\":\"predictable-revenue-efficiency\",\"file_sha256\":\"37644c7ae55ba957018bd8e4254328d0900c8680e184235c336b370375440410\",\"content_sha256\":\"62511d5429d394d37f4671641132df82ef95a7231a0cd92f7e0162c54da236df\",\"file_bytes\":1418,\"body_bytes\":323},{\"atom_id\":\"predictable-revenue-follow-up\",\"file_sha256\":\"79dd55c9190d75967ae0fa1a7e768831e89f8022f83ea9c2199353115a8c4067\",\"content_sha256\":\"36cee15747c15c916b6b98c3ee9ba2c980bfd8e10dfd5658c408ec96fc51eec0\",\"file_bytes\":1419,\"body_bytes\":373},{\"atom_id\":\"predictable-revenue-handoff\",\"file_sha256\":\"d332ca954fe01c33217d74a76256a91cb2b73aabbbff2ac2c40b36d3c9d3e71a\",\"content_sha256\":\"176063b60a8daee6b105e7bdbda20441b1b248495192fbc21fa7703681794129\",\"file_bytes\":1649,\"body_bytes\":491},{\"atom_id\":\"predictable-revenue-hiring\",\"file_sha256\":\"44534f753176db0a210275af622a0329f2c04727b89b2500db33a2e0dbd30f9e\",\"content_sha256\":\"4fd5c87c0529bfbc9ac30b210958e02e04cbbeccc316203f53cdd3f9af0e491c\",\"file_bytes\":1405,\"body_bytes\":315},{\"atom_id\":\"predictable-revenue-icp\",\"file_sha256\":\"a887d33c2b94cf93cbf617ee059fb149f6261db942367a9bd755810f7fc91a12\",\"content_sha256\":\"08c65f5c6c0d149814a6f60f958a42cc05824d49c5a7b09352ab3ef8e459157a\",\"file_bytes\":1455,\"body_bytes\":318},{\"atom_id\":\"predictable-revenue-lagging-indicators\",\"file_sha256\":\"a9614a23150d5c4505053bc53dec8f133d778af447656a82739e6fb919df81de\",\"content_sha256\":\"15c5df43c7d26f72aef9c060cfca5d49e3ea0cc054e3dbcb309ec5011b2cac53\",\"file_bytes\":1233,\"body_bytes\":174},{\"atom_id\":\"predictable-revenue-lead-types\",\"file_sha256\":\"96d55a411cc3d5e0dff5bc14f77825bdacc7bef1a5d5145d0f228fc24a594778\",\"content_sha256\":\"d8111c899251c8b3fd64cca8866610a9754f58977ea2ed8f3552f64912f05e1f\",\"file_bytes\":1782,\"body_bytes\":623},{\"atom_id\":\"predictable-revenue-leading-indicators\",\"file_sha256\":\"109ab43e03e6833b67b05bfd4b5afa0ca22c2ea574204f65fb5da649fbff186e\",\"content_sha256\":\"ccda79ccf7f82a7f130c438e0e5997bd0cddd07805dfd07c98620a6c7850fca0\",\"file_bytes\":1266,\"body_bytes\":182}]"
carrier_sha256: df88c7df1c3fc022fdf2353e9e91e69b16dcd6b61b7ed37232c8472099d8adad
carrier_bytes: 12572
revision: 1
status: active
---
<!-- vpmodule:atom:begin predictable-revenue-efficiency -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-efficiency
title: Track sales efficiency metrics
summary: "Track cost per qualified opportunity, a 2-3 SDRs per AE ratio, LTV:CAC above 3:1 and payback period; review daily, weekly, monthly and quarterly."
capability_tags:
  - run-sales-metrics
pattern_tags:
  - sales-metric-cadence
conditions_applies_when: Reviewing sales efficiency.
conditions_does_not_apply_when: A pre-revenue team with no CAC data.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The review states each efficiency metric, its target and its cadence."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L168-L175"
status: active
revision: 1
---

# Track sales efficiency metrics

Track cost per qualified opportunity, an SDR-to-AE ratio typically of 2-3 SDRs per AE, lifetime-value-to-customer-acquisition-cost with a target above 3:1, and payback period as efficiency metrics. Review daily activity metrics, weekly pipeline, monthly revenue, and quarterly efficiency.
<!-- vpmodule:atom:end predictable-revenue-efficiency -->
<!-- vpmodule:atom:begin predictable-revenue-follow-up -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-follow-up
title: Run the follow-up cadence
summary: "Follow up on Day 3, send a different-angle follow-up on Day 7, a break-up email on Day 14 and a re-engagement on Day 30."
capability_tags:
  - design-sales-motion
pattern_tags:
  - follow-up-cadence
conditions_applies_when: Running an outbound sequence.
conditions_does_not_apply_when: A single email with no follow-up.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The sequence states each day, angle and stop condition."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L79-L90"
status: active
revision: 1
---

# Run the follow-up cadence

Use the follow-up cadence: send the referral email on Day 1; follow up on Day 3 if there is no response; send a second follow-up with a different angle on Day 7; send a break-up email on Day 14; and re-engage on Day 30 with a new trigger event or content. The break-up email often draws the sequence's highest response, attributed to scarcity.
<!-- vpmodule:atom:end predictable-revenue-follow-up -->
<!-- vpmodule:atom:begin predictable-revenue-handoff -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-handoff
title: Standardize the SDR-to-AE handoff
summary: "Include account background, contact details, pain, ANUM notes, next steps and competitive intelligence; introduce the AE and honor opt-outs and spam law."
capability_tags:
  - design-sales-motion
pattern_tags:
  - sales-role-specialization
conditions_applies_when: Handing a qualified opportunity from an SDR to an AE.
conditions_does_not_apply_when: A direct inbound handoff with no SDR step.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The handoff record contains every stated field, and opt-outs are honored immediately."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L102-L109"
status: active
revision: 1
---

# Standardize the SDR-to-AE handoff

In the SDR-to-AE handoff, include account background and ICP match, contact details and role, pain points, ANUM notes, agreed next steps, and competitive intelligence. Have the SDR introduce the AE on a brief three-way call or by email, then leave. Comply with spam laws including CAN-SPAM and GDPR, and honor opt-outs immediately, including removing a hostile stop-emailing request from the sequence on the spot rather than at the next scheduled touch.
<!-- vpmodule:atom:end predictable-revenue-handoff -->
<!-- vpmodule:atom:begin predictable-revenue-hiring -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-hiring
title: Hire SDRs for the stated traits
summary: "Hire for coachability, curiosity, writing, resilience and organization; experience is optional; use the stated sources and the 6-18 month career path."
capability_tags:
  - design-sales-motion
pattern_tags:
  - sales-role-specialization
conditions_applies_when: Hiring an SDR.
conditions_does_not_apply_when: A role that does not do outbound prospecting.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The hiring criteria name the five traits and the career path.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L137-L140"
status: active
revision: 1
---

# Hire SDRs for the stated traits

Hire SDRs for coachability, curiosity, strong writing, resilience, and organization; experience is optional. Source candidates among recent graduates, career changers, and internal transfers. The stated career path is SDR for 6-18 months, then Senior SDR, then AE or SDR Manager.
<!-- vpmodule:atom:end predictable-revenue-hiring -->
<!-- vpmodule:atom:begin predictable-revenue-icp -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-icp
title: Define the ideal customer profile and target list
summary: "Define the ICP by size, industry, stack, geography and pain, then build a target account list and target 200-500 accounts per SDR per quarter."
capability_tags:
  - clarify-requirements
pattern_tags:
  - ideal-customer-profile
conditions_applies_when: Preparing an outbound target list.
conditions_does_not_apply_when: An inbound-only motion with no target accounts.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The ICP names its dimensions and the target list has an owner and a quarterly size.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L71-L74"
status: active
revision: 1
---

# Define the ideal customer profile and target list

Define the Ideal Customer Profile using company size, industry, tech stack, geography, and pain points, then build a target account list using LinkedIn Sales Navigator, ZoomInfo/Apollo/Clearbit, or industry directories. Target 200-500 accounts per SDR per quarter.
<!-- vpmodule:atom:end predictable-revenue-icp -->
<!-- vpmodule:atom:begin predictable-revenue-lagging-indicators -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-lagging-indicators
title: Track lagging indicators
summary: "Track revenue closed, win rate, average deal size, sales cycle length and customer acquisition cost as lagging result indicators."
capability_tags:
  - run-sales-metrics
pattern_tags:
  - sales-metric-cadence
conditions_applies_when: Reporting sales results.
conditions_does_not_apply_when: An activity-only report.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each lagging indicator has a definition and a reporting cadence.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L164-L172"
status: active
revision: 1
---

# Track lagging indicators

Track revenue closed, win rate, average deal size, sales cycle length and customer acquisition cost as lagging result indicators. Review monthly.
<!-- vpmodule:atom:end predictable-revenue-lagging-indicators -->
<!-- vpmodule:atom:begin predictable-revenue-lead-types -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-lead-types
title: "Treat seeds, nets and spears differently"
summary: "Classify leads as seeds, nets or spears by source, conversion and cost, and invest in customer success, content and paid acquisition or an SDR team accordingly."
capability_tags:
  - design-sales-motion
pattern_tags:
  - lead-type-mix
conditions_applies_when: Allocating sales and marketing investment by lead source.
conditions_does_not_apply_when: A single-channel business with one lead source.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each lead type has its source, conversion, cost and matching investment."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L22-L35"
status: active
revision: 1
---

# Treat seeds, nets and spears differently

Treat leads according to type: seeds come from word of mouth, referrals, or organic sources and have the highest conversion and lowest cost but take time and cannot be manufactured quickly; nets come from marketing or inbound and have medium conversion and cost; spears come from outbound prospecting and have lower but predictable conversion and higher people-intensive cost. Most companies over-invest in nets and under-invest in spears. Invest accordingly in customer success and referral programs for seeds, content and paid acquisition for nets, and an SDR team for spears.
<!-- vpmodule:atom:end predictable-revenue-lead-types -->
<!-- vpmodule:atom:begin predictable-revenue-leading-indicators -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-leading-indicators
title: Track leading indicators
summary: "Track emails per SDR per day, response rate, meetings per week, qualified opportunities per month and pipeline value as leading indicators."
capability_tags:
  - run-sales-metrics
pattern_tags:
  - sales-metric-cadence
conditions_applies_when: Building an SDR activity dashboard.
conditions_does_not_apply_when: A lagging-only revenue report.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each leading indicator has an owner, a cadence and a target."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L160-L172"
status: active
revision: 1
---

# Track leading indicators

Track emails per SDR per day, response rate, meetings per week, qualified opportunities per month and pipeline value as leading indicators. Review daily.
<!-- vpmodule:atom:end predictable-revenue-leading-indicators -->