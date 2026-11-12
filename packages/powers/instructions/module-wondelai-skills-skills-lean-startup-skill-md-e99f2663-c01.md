---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-lean-startup-skill-md-e99f2663-c01"
title: "wondelai-skills: skills/lean-startup/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/lean-startup/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/lean-startup/SKILL.md\"}"
atom_ids:
  - lean-startup-actionable-metrics
  - lean-startup-build-measure-learn
  - lean-startup-common-mistakes
  - lean-startup-entrepreneurship-as-management
  - lean-startup-establish-baseline
  - lean-startup-five-whys
  - lean-startup-growth-engine
  - lean-startup-innovation-accounting
atom_count: 8
atoms: "[{\"atom_id\":\"lean-startup-actionable-metrics\",\"file_sha256\":\"c11bf710c020663b2e53e037e7d96ff6c6ac6b87b52dfb7eef67b951f44db066\",\"content_sha256\":\"5dc8996e3b1b3ce1fcd9234a7c77f8b9c164ebd36b34fe1087a7dbc0015a714b\",\"file_bytes\":1275,\"body_bytes\":169},{\"atom_id\":\"lean-startup-build-measure-learn\",\"file_sha256\":\"8f3634645ffdfa5456a7a71ee679c62587083e11d8db8e28d3f1fb8d6a2740cd\",\"content_sha256\":\"775632a8f4ed759501811ed5d8011c9c6b1b0ce5d9aea63bd4c9f68d0a47771c\",\"file_bytes\":1206,\"body_bytes\":157},{\"atom_id\":\"lean-startup-common-mistakes\",\"file_sha256\":\"28f9aba9d218c4cc55eaeb63d2c7af629105659c53c663f3282e9147ff0988e1\",\"content_sha256\":\"1052657441ef112d41ad1da0e9b46398991706e4f39676815b1de94ee8f2db77\",\"file_bytes\":1428,\"body_bytes\":280},{\"atom_id\":\"lean-startup-entrepreneurship-as-management\",\"file_sha256\":\"c50e3f5b12032b11f7e36203c1b1e8cb34bfcbca5b5224a358ff28b8a93f534d\",\"content_sha256\":\"ce1937ab95262a62b65a157f44261dc5f8d8587962d970dbb6bab7f3481a8537\",\"file_bytes\":1631,\"body_bytes\":515},{\"atom_id\":\"lean-startup-establish-baseline\",\"file_sha256\":\"414b2df40552eec0e45c7f1f4615c41fd848b227ca1d431efaf9f3bc34f42801\",\"content_sha256\":\"3df42f0d4aa2c31606f3c9f114672585178a1336a578a9559231662993a82a5a\",\"file_bytes\":1390,\"body_bytes\":247},{\"atom_id\":\"lean-startup-five-whys\",\"file_sha256\":\"09512322daa0eb59668df1f5fe4c277d009aac34e8aa6c60612779b568567f23\",\"content_sha256\":\"99883e92308476a22cf4a480a2e6d5ee260d8b3060dd20ce19746a20b01a2e60\",\"file_bytes\":1211,\"body_bytes\":154},{\"atom_id\":\"lean-startup-growth-engine\",\"file_sha256\":\"c635e057fd686eb07d4f9b26bc34200d48f0736102ff4584e6fd0e20a9d74b6e\",\"content_sha256\":\"875efe65cf36ea1200b1ed42248bb583de8b27a8dab7364945e4517a6ed95929\",\"file_bytes\":1279,\"body_bytes\":214},{\"atom_id\":\"lean-startup-innovation-accounting\",\"file_sha256\":\"f816510f882239facf1f2ac226ff3183c3b9940e50274ea55a1e1fb8633d1347\",\"content_sha256\":\"750cb553cbf62724fb8fc3fe5533f60d6bfe5fea8f2abfc57284085478506591\",\"file_bytes\":1258,\"body_bytes\":172}]"
carrier_sha256: bd999725c57f3ef745cd9b9338853f8339b70d3718c1dd2183779b6a177f3f8d
carrier_bytes: 11635
revision: 1
status: active
---
<!-- vpmodule:atom:begin lean-startup-actionable-metrics -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-actionable-metrics
title: Use actionable metrics and cohorts
summary: "Choose metrics that show reproducible cause and effect, can be understood and checked, and use cohorts to see change over time."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Selecting product or growth metrics.
conditions_does_not_apply_when: A vanity metric that cannot guide a decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The metric has a reproducible cause-effect link and is tracked by cohort where relevant.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L108-L127"
status: active
revision: 1
---

# Use actionable metrics and cohorts

Use actionable metrics that show reproducible cause/effect and can be understood and checked; use cohorts to see change over time.
<!-- vpmodule:atom:end lean-startup-actionable-metrics -->
<!-- vpmodule:atom:begin lean-startup-build-measure-learn -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-build-measure-learn
title: Run the build-measure-learn loop
summary: "Plan backward from the learning goal to its metric and minimum build, and minimize cycle time."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Testing a product hypothesis.
conditions_does_not_apply_when: A routine change with no learning goal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The loop names the learning goal, metric and minimum build, and shortens the cycle."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L28-L40"
status: active
revision: 1
---

# Run the build-measure-learn loop

Run Ideas→Build→Measure→Learn; plan backward from learning to its metric and minimum build, minimizing cycle time.
<!-- vpmodule:atom:end lean-startup-build-measure-learn -->
<!-- vpmodule:atom:begin lean-startup-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-common-mistakes
title: Avoid common lean-startup mistakes
summary: "Avoid overbuilding, opinion-based validation, vanity metrics, experiments without hypotheses, slow pivots, missing baselines and premature scale optimization."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing a lean-startup practice for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the evidence-based correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L216-L227"
status: active
revision: 1
---

# Avoid common lean-startup mistakes

Avoid overbuilding, opinion-based customer validation, vanity metrics, experiments without hypotheses, slow pivots, missing baselines, and premature scale optimization; test small, observe behavior, set criteria, and validate before scaling.
<!-- vpmodule:atom:end lean-startup-common-mistakes -->
<!-- vpmodule:atom:begin lean-startup-entrepreneurship-as-management -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-entrepreneurship-as-management
title: Treat entrepreneurship as management
summary: "Treat every plan as hypotheses to falsify, learn from customers and iterate rather than execute a fixed roadmap."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Starting or steering a new product under uncertainty.
conditions_does_not_apply_when: A proven operation executing a stable process.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan is framed as falsifiable assumptions with a validated-learning loop.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L14-L17"
status: active
revision: 1
---

# Treat entrepreneurship as management

Entrepreneurship is a form of management. Success doesn't require a perfect plan or brilliant insight—it requires a systematic process for testing assumptions, learning from customers, and iterating rapidly. Most startups fail not because they couldn't build what they planned, but because they built the wrong thing: treat every plan as a set of hypotheses to falsify, and spend effort to eliminate waste and accelerate validated learning, not to execute a fixed roadmap.
<!-- vpmodule:atom:end lean-startup-entrepreneurship-as-management -->
<!-- vpmodule:atom:begin lean-startup-establish-baseline -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-establish-baseline
title: Establish a precise baseline
summary: "Measure the current conversion funnel, engagement and unit economics precisely, even when the numbers are zero or embarrassing."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Starting innovation accounting or tuning an engine.
conditions_does_not_apply_when: A product with no users or measurable behavior yet.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - baseline
artifact_contract_verified_by: "The baseline records funnel, engagement and economics without rounding away inconvenient values."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L94-L97"
status: active
revision: 1
---

# Establish a precise baseline

Measure current reality precisely, even if it's zero or embarrassing: conversion funnel (signup → active → retained → paying), engagement (DAU/MAU, session length, features used), economics (CAC, LTV, churn).
<!-- vpmodule:atom:end lean-startup-establish-baseline -->
<!-- vpmodule:atom:begin lean-startup-five-whys -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-five-whys
title: Use the five whys
summary: "Ask why repeatedly to find the root cause and invest proportionally at every level, not only the symptom."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Diagnosing a recurring product or process problem.
conditions_does_not_apply_when: A one-off failure with an obvious cause.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The analysis reaches a root cause and proposes proportionate action at each level.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L171-L185"
status: active
revision: 1
---

# Use the five whys

Root cause analysis: when a problem occurs, ask "why?" five times, then invest proportionally at every level—not just the symptom.
<!-- vpmodule:atom:end lean-startup-five-whys -->
<!-- vpmodule:atom:begin lean-startup-growth-engine -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-growth-engine
title: Choose one growth engine
summary: "Pick one engine, optimize it, then consider adding others rather than diluting focus across several."
capability_tags:
  - design-experiments
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Choosing how a startup acquires and retains customers.
conditions_does_not_apply_when: A business with no repeatable acquisition motion.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: One growth engine is selected and optimized before another is added.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L153-L156"
status: active
revision: 1
---

# Choose one growth engine

How a startup acquires and retains customers sustainably. Pick one engine, optimize it, then consider adding others—running multiple engines simultaneously dilutes focus and learning.
<!-- vpmodule:atom:end lean-startup-growth-engine -->
<!-- vpmodule:atom:begin lean-startup-innovation-accounting -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-innovation-accounting
title: Use innovation accounting
summary: "Measure progress when revenue and customers start at zero, and replace vanity metrics with metrics that drive decisions."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Tracking progress in an early-stage product.
conditions_does_not_apply_when: A mature business with established financial reporting.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The metrics start from a measured baseline and inform a decision.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L90-L93"
status: active
revision: 1
---

# Use innovation accounting

Measuring progress when traditional metrics fail: revenue and customers start at zero, and vanity metrics look good without driving decisions.
<!-- vpmodule:atom:end lean-startup-innovation-accounting -->