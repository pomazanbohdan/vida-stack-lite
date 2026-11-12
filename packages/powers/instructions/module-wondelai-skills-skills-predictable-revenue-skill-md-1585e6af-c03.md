---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-predictable-revenue-skill-md-1585e6af-c03"
title: "wondelai-skills: skills/predictable-revenue/SKILL.md module"
summary: "Carrier for 6 atomic instructions from wondelai-skills:skills/predictable-revenue/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/predictable-revenue/SKILL.md\"}"
atom_ids:
  - predictable-revenue-pipeline-math
  - predictable-revenue-ramp
  - predictable-revenue-referral-email
  - predictable-revenue-role-separation
  - predictable-revenue-score
  - predictable-revenue-sdr
atom_count: 6
atoms: "[{\"atom_id\":\"predictable-revenue-pipeline-math\",\"file_sha256\":\"d2128b43fb01b9ec1e0cbd77bfce94d9aa0adc4272e377adbc27c71bcff757e2\",\"content_sha256\":\"55c886d634a661f2d46e6917a3ddba0a290fc13d91e0f7b479a422174982b61d\",\"file_bytes\":1850,\"body_bytes\":707},{\"atom_id\":\"predictable-revenue-ramp\",\"file_sha256\":\"77d15b620f87b8c72b58200954c8fa69e5daf0ef0c6cf8713266a28270177aba\",\"content_sha256\":\"f01f2bcdb9f427dd010a1059da3d20923be0341b635357fd8bafee846357b7ab\",\"file_bytes\":1368,\"body_bytes\":268},{\"atom_id\":\"predictable-revenue-referral-email\",\"file_sha256\":\"e85e3230e25f489627d7685341f0f36ca33fd2d5b45c6665447cb89a71017e07\",\"content_sha256\":\"31952680b7110716a5b15d633e4db0adff67f03764ee6c6e1bffec000b1fb7a0\",\"file_bytes\":1530,\"body_bytes\":357},{\"atom_id\":\"predictable-revenue-role-separation\",\"file_sha256\":\"dd8b32b6f054eca507bfcad2b07966a6e77755dc4f04ec7542a142d2e4456e06\",\"content_sha256\":\"4b8508553c4171c0b17349af47c9dfb3d140114919dedc4970969b88f7beff0f\",\"file_bytes\":1746,\"body_bytes\":567},{\"atom_id\":\"predictable-revenue-score\",\"file_sha256\":\"a611c741418885c40b26947f8b3240218ba6c523b2319562d623601288468703\",\"content_sha256\":\"275338227792b3152c4dae66d3ab2476161406c8d81a1ca9c3a12b06217c4971\",\"file_bytes\":1785,\"body_bytes\":637},{\"atom_id\":\"predictable-revenue-sdr\",\"file_sha256\":\"7ca73c0d7f16a9efbb2f05d80efd2b7a40d3370138c15de1662c37f702567b93\",\"content_sha256\":\"f9bc25dd5acdc707e65fe7ce2d656b99d24f82465ab877e556170312a8c26092\",\"file_bytes\":1613,\"body_bytes\":442}]"
carrier_sha256: d0813f12806f5c1772f313ad82829615ed0c9b2b487a2c998e964d240f6833a5
carrier_bytes: 10587
revision: 1
status: active
---
<!-- vpmodule:atom:begin predictable-revenue-pipeline-math -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-pipeline-math
title: Work backward from the revenue goal
summary: "Divide the revenue goal by deal size, win rate, SDR conversion and response rate to derive deals, opportunities, prospects and emails, and use the result to size the SDR team."
capability_tags: []
pattern_tags:
  - pipeline-math
conditions_applies_when: Sizing an outbound team or setting a pipeline target.
conditions_does_not_apply_when: A revenue plan with no outbound motion.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The model states each input, the derived stages and the resulting SDR count."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L110-L132"
status: active
revision: 1
---

# Work backward from the revenue goal

Work backward from the revenue goal: divide revenue goal by average deal size for deals needed; divide deals by win rate for opportunities needed; divide opportunities by SDR conversion for prospects needed; and divide prospects by response rate for emails needed. The example applies $1M ARR, $20K deals, 25% win rate, 10% response and 10% response-to-qualified conversion to estimate 50 deals, 200 opportunities, 20,000 emails, and approximately 2-3 SDRs sending 300-500 emails monthly each. Benchmarks: 50-100 emails per SDR per day; 9-15% response rate; 10-20 qualified opportunities per SDR per month; 20-30% AE demo-to-close rate; 30-90 day average sales cycle.
<!-- vpmodule:atom:end predictable-revenue-pipeline-math -->
<!-- vpmodule:atom:begin predictable-revenue-ramp -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-ramp
title: Use the SDR ramp stages
summary: "Train in weeks 1-2, shadow in weeks 3-4, ramp at 50% quota in months 2-3 and reach full quota from month 4; expect 3-4 months to productivity."
capability_tags:
  - design-sales-motion
pattern_tags:
  - sales-role-specialization
conditions_applies_when: Onboarding a new SDR.
conditions_does_not_apply_when: An experienced hire with a negotiated shorter ramp.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The ramp states each stage, quota level and expected time to productivity."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L141-L151"
status: active
revision: 1
---

# Use the SDR ramp stages

Use the stated SDR ramp stages: training in weeks 1-2 for product knowledge, tools, and process; shadowing in weeks 3-4; ramping in months 2-3 at 50% quota; and full quota from month 4 onward at 100%. Expect 3-4 months to full productivity.
<!-- vpmodule:atom:end predictable-revenue-ramp -->
<!-- vpmodule:atom:begin predictable-revenue-referral-email -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-referral-email
title: Write the referral email
summary: "Contact a senior person above the decision maker, keep the email under 100 words, ask only who the right person is, include no pitch or links, and make it easy to forward."
capability_tags:
  - design-sales-motion
pattern_tags:
  - outbound-prospecting
conditions_applies_when: Writing the first outbound email.
conditions_does_not_apply_when: A cold email that pitches the product directly.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The email asks only for the right person, stays under 100 words, and carries no pitch, attachment or link."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L75-L78"
status: active
revision: 1
---

# Write the referral email

For the referral email, contact a senior person above the decision maker and ask for a referral to the right person. Keep the email under 100 words, ask only who the right person is, include no pitch, attachments, or links, and make it easy to forward. The section reports 9-15% response versus 1-3% for traditional cold emails.
<!-- vpmodule:atom:end predictable-revenue-referral-email -->
<!-- vpmodule:atom:begin predictable-revenue-role-separation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-role-separation
title: "Separate prospecting, closing and retention roles"
summary: "Assign outbound prospecting to SDRs, inbound qualification to MDRs, closing to AEs and retention to CSMs, each with its own metrics and handoff."
capability_tags:
  - design-sales-motion
pattern_tags:
  - sales-role-specialization
conditions_applies_when: Designing a sales team structure.
conditions_does_not_apply_when: A founder-led sales motion with one person doing all roles.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each role has a stated scope, metric and handoff, and no role closes and prospects by default."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L36-L46"
status: active
revision: 1
---

# Separate prospecting, closing and retention roles

Separate prospecting from closing; when AEs perform both, prospecting aversion can make pipeline feast-or-famine. Assign outbound prospecting to SDRs, inbound qualification to MDRs, closing to AEs, and retention and account growth to CSMs. Role metrics: SDR — qualified meetings per month; MDR — qualified leads per month; AE — revenue closed and win rate; CSM — retention and expansion revenue. The intended cycle is SDR pipeline generation, AE closing, CSM retention and growth, then customer referrals.
<!-- vpmodule:atom:end predictable-revenue-role-separation -->
<!-- vpmodule:atom:begin predictable-revenue-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-score
title: Score the sales process against the diagnostic
summary: "Score five diagnostic rows at 2 points each, report the score and failing rows, and apply the stated 9-10, 5-6 and 3-or-below characteristics."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a B2B sales process.
conditions_does_not_apply_when: A code review that does not assess sales.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows and the stated characteristics."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the sales process against the diagnostic

Score a sales process from 0 to 10 by awarding 2 points for each satisfied Quick Diagnostic row: separated prospecting and closing, a defined outbound process, pipeline predictability three months ahead, known lead-type mix, and a standardized SDR-to-AE handoff. Interpret 9-10 as role separation plus a repeatable process that predicts pipeline; 5-6 as some specialization with ad hoc prospecting or unpredictable pipeline; and 3 or below as one person prospecting and closing with revenue depending on heroics. Always report the current score and the diagnostic rows preventing 10/10.
<!-- vpmodule:atom:end predictable-revenue-score -->
<!-- vpmodule:atom:begin predictable-revenue-sdr -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-sdr
title: Run the SDR role
summary: "An SDR researches target accounts, sends Cold Calling 2.0 emails, obtains referrals, qualifies with ANUM and passes opportunities to AEs; measure opportunities, response rate, meetings and pipeline."
capability_tags:
  - design-sales-motion
pattern_tags:
  - outbound-prospecting
conditions_applies_when: Defining or reviewing an SDR role.
conditions_does_not_apply_when: A role that also closes deals or manages existing customers.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The SDR scope excludes closing and account management, and its metrics are stated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L47-L50"
status: active
revision: 1
---

# Run the SDR role

An SDR generates qualified pipeline by researching target accounts, sending Cold Calling 2.0 emails, obtaining referral to the right person, qualifying with ANUM, and passing qualified opportunities to AEs. SDRs do not close deals, handle inbound leads, or manage existing customers. A typical SDR generates 10-20 qualified opportunities monthly; measure opportunities, response rate, meetings booked, and pipeline value.
<!-- vpmodule:atom:end predictable-revenue-sdr -->