---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-lean-startup-skill-md-e99f2663-c02"
title: "wondelai-skills: skills/lean-startup/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/lean-startup/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/lean-startup/SKILL.md\"}"
atom_ids:
  - lean-startup-leap-of-faith
  - lean-startup-mvp
  - lean-startup-paid-engine
  - lean-startup-pivot-criteria
  - lean-startup-pivot-or-persevere
  - lean-startup-risk-plan
  - lean-startup-score
  - lean-startup-small-batches
atom_count: 8
atoms: "[{\"atom_id\":\"lean-startup-leap-of-faith\",\"file_sha256\":\"fc1761f172dcaf7beec02696401692cc29d510040b1e97b089c68f1210d2f92e\",\"content_sha256\":\"5ab44e003cbc990e744f484d6410a90ae6803103495958dfe39d2602a94144d9\",\"file_bytes\":1344,\"body_bytes\":227},{\"atom_id\":\"lean-startup-mvp\",\"file_sha256\":\"11943a6c02e8944e398d3f1bc144b051ddd7533db2a4debb1ca1b808ad41c51d\",\"content_sha256\":\"0cde3bd607f6445b8f84c67d42a8e15a8aea4fd04c06f4691d0c419dd6dd1c58\",\"file_bytes\":1432,\"body_bytes\":333},{\"atom_id\":\"lean-startup-paid-engine\",\"file_sha256\":\"c2f1244c1d85af37fb2695931d8fa05901420900182aef66978e04bbd1c1a7c9\",\"content_sha256\":\"fc0cb663c02df6c8a776456fd9364408f6af0bb3434505b604d92884f2110a81\",\"file_bytes\":1265,\"body_bytes\":244},{\"atom_id\":\"lean-startup-pivot-criteria\",\"file_sha256\":\"57b2beaa078fc4e2ed1511eabb31dc238fe72f51a7106336075212391d4c2f71\",\"content_sha256\":\"df2127fe35d19baf803d981cfdbc625030049e4425bbf57938648c8fbb8a401e\",\"file_bytes\":1271,\"body_bytes\":177},{\"atom_id\":\"lean-startup-pivot-or-persevere\",\"file_sha256\":\"bad088b951e160af3ae4f3a9108e95e78cf127a193465569835aac886dc8cc85\",\"content_sha256\":\"24ceb2167c3069be5819cbe5292bdd50dfa8b02db577e09a8ea95214d1b722dd\",\"file_bytes\":1283,\"body_bytes\":176},{\"atom_id\":\"lean-startup-risk-plan\",\"file_sha256\":\"3863d67f8712e9902bf258c25723cddcc2103ea6710975ad383c75beaa6bfc8b\",\"content_sha256\":\"d9f17d0e75cdb6377b89764e6694af8dda056896d31a75f86b994669d3036451\",\"file_bytes\":1411,\"body_bytes\":242},{\"atom_id\":\"lean-startup-score\",\"file_sha256\":\"a23369c56c1632902772d91e5a04d9aeb4e834eaabc853a3973ac6463410937e\",\"content_sha256\":\"27ed2e209610fb04aa89038759be1ee9b0f103269b26674f1be8a436851eeccf\",\"file_bytes\":1403,\"body_bytes\":289},{\"atom_id\":\"lean-startup-small-batches\",\"file_sha256\":\"1567094c82d942088fac68ba8189b629f3eab47fcb52d7fd36a2e3ecf570e4a5\",\"content_sha256\":\"542795dd98794039be63bdd342af3de0c85c31affe52d9eab371d7921b377ad6\",\"file_bytes\":1183,\"body_bytes\":146}]"
carrier_sha256: 6110fce52309984ceb6607a5dc359e08ef0895ce1f7fe23e78375e0df3db77c7
carrier_bytes: 11435
revision: 1
status: active
---
<!-- vpmodule:atom:begin lean-startup-leap-of-faith -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-leap-of-faith
title: Test leap-of-faith assumptions first
summary: "Identify the assumptions whose failure would be fatal, prioritize by risk rather than ease, and test the riskiest first."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - risk-first-ordering
conditions_applies_when: Planning product experiments under uncertainty.
conditions_does_not_apply_when: An assumption already supported by direct evidence.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - assumptions
  - tests
artifact_contract_verified_by: The riskiest fatal assumption is tested before easier ones.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L75-L89"
status: active
revision: 1
---

# Test leap-of-faith assumptions first

The assumptions that, if wrong, will cause your business to fail. Identify them, prioritize by risk (which failure would be fatal?), and test the riskiest first—never in order of ease.
<!-- vpmodule:atom:end lean-startup-leap-of-faith -->
<!-- vpmodule:atom:begin lean-startup-mvp -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-mvp
title: Build the smallest learning vehicle
summary: "Use a minimum viable product that maximizes validated learning with the least effort, not a prototype or a polished beta."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Deciding what to build to test a product hypothesis.
conditions_does_not_apply_when: A release whose purpose is delivery rather than learning.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The MVP is scoped to the learning goal and is smaller than a marketable release.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L57-L74"
status: active
revision: 1
---

# Build the smallest learning vehicle

The version of a new product that allows maximum validated learning with the least effort. Not a prototype (technical feasibility), not a beta (quality), not a minimum marketable product—a learning vehicle, often embarrassingly small and low quality, and usually much smaller than you think.
<!-- vpmodule:atom:end lean-startup-mvp -->
<!-- vpmodule:atom:begin lean-startup-paid-engine -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-paid-engine
title: Operate a paid growth engine
summary: "Require LTV greater than CAC with a target ratio above 3x, and track payback period."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Acquiring customers through paid channels.
conditions_does_not_apply_when: A business with no acquisition spend.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "LTV, CAC and payback are measured against the stated ratio."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L165-L170"
status: active
revision: 1
---

# Operate a paid growth engine

Spend to acquire: requires `LTV > CAC` (target LTV/CAC > 3x). Track CAC, LTV, and payback period. Fits e-commerce and traditional businesses. Strategy: optimize until each customer's profit funds acquiring more.
<!-- vpmodule:atom:end lean-startup-paid-engine -->
<!-- vpmodule:atom:begin lean-startup-pivot-criteria -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-pivot-criteria
title: Apply explicit pivot criteria
summary: "Pivot on repeated failed hypotheses, flat metrics, contradictory feedback or insufficient runway; persevere when metrics and learning improve."
capability_tags:
  - design-experiments
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Deciding whether to change product direction.
conditions_does_not_apply_when: A decision with no defined evidence threshold.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The pivot or perseverance decision cites the stated criteria.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L128-L152"
status: active
revision: 1
---

# Apply explicit pivot criteria

Pivot on repeated failed hypotheses, flat metrics, contradictory feedback, or insufficient runway; persevere when metrics and learning improve.
<!-- vpmodule:atom:end lean-startup-pivot-criteria -->
<!-- vpmodule:atom:begin lean-startup-pivot-or-persevere -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-pivot-or-persevere
title: Decide to pivot or persevere on evidence
summary: "When tuning stalls, make a pivot-or-persevere decision using explicit criteria and a named pivot type."
capability_tags:
  - design-experiments
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A product experiment cycle has stopped improving metrics.
conditions_does_not_apply_when: A single noisy measurement with no trend.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The decision states the evidence, the criterion and the chosen pivot type or perseverance."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L102-L107"
status: active
revision: 1
---

# Decide to pivot or persevere on evidence

When tuning stalls, make an evidence-based pivot-or-persevere decision using the criteria and pivot types in the dedicated section.
<!-- vpmodule:atom:end lean-startup-pivot-or-persevere -->
<!-- vpmodule:atom:begin lean-startup-risk-plan -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-risk-plan
title: Plan the riskiest test and pivot trigger
summary: "For each plan, identify the riskiest assumption, its test, the validation metric and the fallback, and define pivot triggers upfront."
capability_tags:
  - plan-implementation
pattern_tags:
  - risk-first-ordering
conditions_applies_when: Planning product work under uncertainty.
conditions_does_not_apply_when: A plan with no meaningful assumption risk.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - riskiest_assumption
  - test
  - metric
  - fallback
artifact_contract_verified_by: "The plan names the riskiest assumption, its test, metric and fallback before work starts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L228-L239"
status: active
revision: 1
---

# Plan the riskiest test and pivot trigger

For each plan, identify the riskiest assumption, how to test it, a metric to validate/invalidate it, whether a smaller test is possible, and what happens if it fails; define pivot triggers upfront.
<!-- vpmodule:atom:end lean-startup-risk-plan -->
<!-- vpmodule:atom:begin lean-startup-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-score
title: Score the lean-startup practice
summary: "Score five diagnostic rows with extra credit for Validation Ladder Level 3+ evidence, and report the score and lowest row."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing whether a product practice is evidence-based.
conditions_does_not_apply_when: A narrow delivery review that does not assess learning.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - lowest_row
artifact_contract_verified_by: The report states the score and the lowest-scoring row.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score the lean-startup practice

Score five diagnostic rows: 1 per yes, or 2 when supported by Validation Ladder Level 3+ evidence. Report score and lowest-scoring row; bands distinguish evidence-backed risk testing from undefined metrics/pivot criteria and waterfall/premature scaling.
<!-- vpmodule:atom:end lean-startup-score -->
<!-- vpmodule:atom:begin lean-startup-small-batches -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-small-batches
title: Work in small batches
summary: "Use small batches for faster feedback, easier pivots, less waste and faster time to market."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - revertable-increments
conditions_applies_when: Planning product delivery or experiments.
conditions_does_not_apply_when: A change that must be delivered atomically for safety.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Work is split into batches that shorten the feedback loop.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L186-L200"
status: active
revision: 1
---

# Work in small batches

Work in small batches for faster feedback loops, easier pivots, less waste when you're wrong, and faster time to market.
<!-- vpmodule:atom:end lean-startup-small-batches -->