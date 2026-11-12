---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-lean-analytics-skill-md-357c91a5-c01"
title: "wondelai-skills: skills/lean-analytics/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/lean-analytics/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/lean-analytics/SKILL.md\"}"
atom_ids:
  - lean-analytics-apply
  - lean-analytics-baselines
  - lean-analytics-business-model-metrics
  - lean-analytics-common-mistakes
  - lean-analytics-diagnostic
  - lean-analytics-good-metrics
  - lean-analytics-omtm
  - lean-analytics-omtm-focus
atom_count: 8
atoms: "[{\"atom_id\":\"lean-analytics-apply\",\"file_sha256\":\"ebdd83f08c537bad09a512b86ff55d7ec1bd83e83d203ef8b27d71f954ee6483\",\"content_sha256\":\"a9b6f10390374468277dca6ebdac646a87681690f79968d8b53bf3a9733b7328\",\"file_bytes\":1640,\"body_bytes\":448},{\"atom_id\":\"lean-analytics-baselines\",\"file_sha256\":\"d89fa18284bc99b3c5c67a903a266c1db5e0f76aa4f75b3b0d629492ebd6fc5a\",\"content_sha256\":\"ba16bf44aa22742ba03ab36dff9525cd3e114bd0d935778366281e65b606d640\",\"file_bytes\":2324,\"body_bytes\":1137},{\"atom_id\":\"lean-analytics-business-model-metrics\",\"file_sha256\":\"b816996f2b8d17f0c70254617b44379c43b357148206ff30cc1ed085d2c5bae3\",\"content_sha256\":\"f1c3f3494dced5b2a18050ca3f3c1719e374757b90e93070cea1b69358dd5646\",\"file_bytes\":2488,\"body_bytes\":1277},{\"atom_id\":\"lean-analytics-common-mistakes\",\"file_sha256\":\"ba9aacfe2d0c3719f341dfc14999ef157015f06d79c13f172d77dec1bc0f6d2e\",\"content_sha256\":\"db2236779ca1a18c0656d131abeecf695f3acf6e2da74e10007b92e1c826642c\",\"file_bytes\":2060,\"body_bytes\":896},{\"atom_id\":\"lean-analytics-diagnostic\",\"file_sha256\":\"0b017e7a393b1e6059f50846cdd6376b97581a878231e8267a912d14768778a6\",\"content_sha256\":\"defa20c1855513212cbd0a735161e55dc82fc71c6827b2595781500db2bbc1df\",\"file_bytes\":2044,\"body_bytes\":830},{\"atom_id\":\"lean-analytics-good-metrics\",\"file_sha256\":\"f7c474641b6739d3a6d31b8234a8f35bb8822f915badde8571cd47632c67f6d4\",\"content_sha256\":\"c74fae07891ea557e0f0280863b4ca23156f38d1ccde2a9841bdf175327bf9f5\",\"file_bytes\":2130,\"body_bytes\":934},{\"atom_id\":\"lean-analytics-omtm\",\"file_sha256\":\"402fa9934ae88efbc3359726370a5fe3793aa0a6949d9225904afeff74f278c5\",\"content_sha256\":\"f5f3a97590c1ddf86990ff8caf8768dafc119f6082092e071cc81ecd29f097d7\",\"file_bytes\":1956,\"body_bytes\":780},{\"atom_id\":\"lean-analytics-omtm-focus\",\"file_sha256\":\"20d45e4af6be1d34deb76418bf5d060dcb8f34d45ebdc7c1a1e31de58e7e0505\",\"content_sha256\":\"93d75947af872e1e368da8a40e3fcdf591e9a1b512807043d2972eca99fa7a18\",\"file_bytes\":1523,\"body_bytes\":328}]"
carrier_sha256: 7067e3dce7ee91062006076fdafcf0af0b6688b5c5c4d449752dca630daef24c
carrier_bytes: 17042
revision: 1
status: active
---
<!-- vpmodule:atom:begin lean-analytics-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-apply
title: Apply Lean Analytics to metric selection and audits
summary: "Use Lean Analytics to choose and audit startup metrics, set targets and plan instrumentation by business model and stage."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Choosing metrics, auditing a dashboard or planning instrumentation for a startup or feature."
conditions_does_not_apply_when: A one-off report with no metric choice or instrumentation decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The work names the business model, the stage and the metrics it will instrument or audit."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L1-L13"
status: active
revision: 1
---

# Apply Lean Analytics to metric selection and audits

Activate this skill for metric selection, KPI/OMTM or vanity-metric questions, dashboard audits, startup or feature metric targets and baselines, and metric instrumentation by business model and stage. Use it to choose and audit startup metrics, set targets, and plan instrumentation; use lean-startup for the build-measure-learn loop and improve-retention for fixing activation or retention.
<!-- vpmodule:atom:end lean-analytics-apply -->
<!-- vpmodule:atom:begin lean-analytics-baselines -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-baselines
title: Set baselines and lines in the sand
summary: "Use published baselines as heuristics, define good enough, and pre-commit a target, date and miss action; re-derive benchmarks against your own cohorts."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Setting a metric target, triaging an anomaly or evaluating a channel."
conditions_does_not_apply_when: A metric with no decision attached.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The target names a number, a date and a miss action, and any benchmark is checked against the organization's cohorts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L128-L151"
status: active
revision: 1
---

# Set baselines and lines in the sand

Do not treat a metric without a target as useful decision guidance. Use published baselines as starting heuristics, not laws, to define “good enough,” then set a target number, date, and precommitted miss action. Treat roughly 5% monthly early-SaaS customer churn as an upper viability bound and roughly 2% or lower as healthy direction; DAU/MAU around 20%+ as a real-engagement signal; casual mobile day-30 retention around 14% as an approximate average; e-commerce visitor conversion around 1–3% as typical; and 25–30% landing-page conversion on good paid traffic as exceptional, not a planning number. Viral coefficient above 1 is rare and fleeting; treat virality as CAC reduction and optimize cycle time before coefficient. Without a relevant benchmark, measure current performance, improve against it, and watch the derivative; 5% weekly improvement compounds. Re-derive benchmarks for market, channel, price point, and era, and validate against own cohorts before adopting another party’s number. Apply baselines and commitments to targets, anomaly triage, and channel evaluation.
<!-- vpmodule:atom:end lean-analytics-baselines -->
<!-- vpmodule:atom:begin lean-analytics-business-model-metrics -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-business-model-metrics
title: Choose metrics from the business model
summary: "Name the model first, use its archetype-specific metric tree and thresholds, choose one primary model for a hybrid, and define each formula and source up front."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Instrumenting a product or choosing its north-star metrics.
conditions_does_not_apply_when: A pre-revenue prototype with no business model yet.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The model and its metric tree are named, each formula and source is defined, and a hybrid names one primary model."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L80-L103"
status: active
revision: 1
---

# Choose metrics from the business model

Name the business model before selecting its metric tree because model mechanics determine which metrics matter; use archetype-specific measures for e-commerce, SaaS, free mobile apps, media, user-generated content, or two-sided marketplaces. E-commerce includes conversion, average order value, and repurchase; annual repurchase below about 40% indicates acquisition mode and above about 60% loyalty mode, each with a different playbook. SaaS includes MRR, churn, LTV:CAC, expansion, and time-to-value. Free mobile includes downloads, DAU/MAU, paying share, and ARPDAU versus ARPPU, accounting for whale skew. Media uses audience, engaged time rather than raw pageviews, CTR, and RPM. UGC uses the visitor-to-voyeur-to-commenter-to-creator funnel, content per user, and spam rate. Marketplaces use liquidity measures including listings, fill/sell-through, time-to-transaction, take rate, and buyer/seller ratio; GMV alone is vanity until multiplied by take rate. A hybrid business must choose ONE primary model for its OMTM; the secondary model supplies counter-metrics, not equal billing. Define each metric’s formula and source up front. Use model-specific trees and ratios for instrumentation, north-star choices, and reporting.
<!-- vpmodule:atom:end lean-analytics-business-model-metrics -->
<!-- vpmodule:atom:begin lean-analytics-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-common-mistakes
title: Avoid the listed analytics mistakes
summary: "Avoid dashboard sprawl, cumulative charts, copied north stars, skipped cohorts, premature virality, easy metrics, missing targets and correlation-as-causation, and apply each fix."
capability_tags:
  - verify-work-results
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a metric set or dashboard for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L152-L164"
status: active
revision: 1
---

# Avoid the listed analytics mistakes

Avoid these failure patterns and apply the paired fix: a 40-metric dashboard diffuses ownership, so show one large OMTM and 4–6 supporting metrics and archive the rest; cumulative charts hide decay, so plot rates, conversions, and cohort retention; copying another company's north star ignores model differences, so derive OMTM from model and stage; skipping cohorts hides product change, so track each signup cohort over time; optimizing virality before stickiness multiplies churn, so pass retention before invite loops; measuring what is easy rather than risky leaves gut-driven decisions, so instrument the riskiest assumption first; omitting a line in the sand enables rationalization, so pre-commit target, date, and miss response; confusing correlation with causation risks optimizing a non-driver, so run a controlled experiment before investing.
<!-- vpmodule:atom:end lean-analytics-common-mistakes -->
<!-- vpmodule:atom:begin lean-analytics-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-diagnostic
title: Run the Lean Analytics diagnostic
summary: "Check the OMTM, decision value, ratio form, model and stage, target, cohorting and counter-metric, and apply the matching action for each failed check."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a metric set or dashboard.
conditions_does_not_apply_when: A full analytics audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L165-L177"
status: active
revision: 1
---

# Run the Lean Analytics diagnostic

Use the diagnostic questions to check whether the team can name its current OMTM; whether the metric changes the next action; whether it is a ratio or rate rather than a total; whether business archetype and stage are known; whether a target, date, and miss plan exist; whether data is cohorted and segmented; and whether a counter-metric guards OMTM. For each “No,” follow the stated action: select one metric from current model and stage, drop a non-decision metric or define its gating decision, rewrite totals as conversion/retention/per-user rates, name one of the six archetypes and use its metrics, find the first unpassed gate, write the line in the sand, build cohort tables and split by channel and segment, and pair a counter-metric such as signup growth with 30-day retention.
<!-- vpmodule:atom:end lean-analytics-diagnostic -->
<!-- vpmodule:atom:begin lean-analytics-good-metrics -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-good-metrics
title: Separate good metrics from vanity metrics
summary: "Prefer comparative, understandable ratios or rates that change behavior; use cohorts, segments and experiments, and treat cumulative charts as a vanity warning."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Auditing a dashboard or choosing a product metric.
conditions_does_not_apply_when: A statutory financial report with a fixed format.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each metric is a ratio or rate, has a comparison, and states the decision it changes; totals are rewritten or removed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L30-L53"
status: active
revision: 1
---

# Separate good metrics from vanity metrics

Prefer metrics that are comparative, understandable, ratios or rates rather than ever-growing totals, and capable of changing behavior; stop measuring a number that will not change an action. Use qualitative/quantitative, exploratory/reporting, leading/lagging, and correlated/causal lenses for their distinct purposes. Treat correlation as a way to find candidate levers, then use a randomized experiment changing one factor to test causality. Compare cohorts over time and segment by channel, plan, and geography; use medians and percentiles where skew makes averages misleading. Treat cumulative up-and-to-the-right charts as a strong vanity warning. In dashboard audits rewrite totals as ratios; in board reports show cohorts rather than cumulative curves; for feature decisions require a behavior-changing metric. Consult the linked detailed reference for its stated audit use cases.
<!-- vpmodule:atom:end lean-analytics-good-metrics -->
<!-- vpmodule:atom:begin lean-analytics-omtm -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-omtm
title: Run the One Metric That Matters
summary: "Select one OMTM for the current riskiest assumption, rotate it at stage gates, pair it with a counter-metric, and pre-commit a target, date and miss response."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: "Planning a quarter, designing a dashboard or aligning a team on a metric."
conditions_does_not_apply_when: A metric used only for external reporting.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The OMTM, its counter-metric, its target date and the miss response are written before results arrive."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L54-L79"
status: active
revision: 1
---

# Run the One Metric That Matters

At any moment select the one metric that indicates whether the current riskiest assumption is working, display it broadly, and let it drive experiments until the next stage. Rotate it when a stage gate is passed or the business pivots. Pair it with a counter-metric to limit gaming; define a line in the sand with a target, date, and precommitted response to a miss, and decide “good enough” in advance. If the team cannot agree on the OMTM, resolve disagreement about the riskiest business issue. Collect many metrics but watch one, keeping others in drill-down reports. The line disciplines company bets, not individuals; personal OMTM quotas invite gaming and conceal truth. Apply these rules to planning, dashboards, and team alignment.
<!-- vpmodule:atom:end lean-analytics-omtm -->
<!-- vpmodule:atom:begin lean-analytics-omtm-focus -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-omtm-focus
title: Focus on the one metric that matters now
summary: "Track the single metric that shows whether the riskiest part of the business works, and stop measuring numbers that will not change the next action."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Selecting the metric a team will watch in the current period.
conditions_does_not_apply_when: A reporting obligation that requires a fixed set of metrics.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "One current metric is named, tied to the riskiest assumption, and every other metric has a stated secondary use."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L14-L17"
status: active
revision: 1
---

# Focus on the one metric that matters now

Focus on the single metric that currently indicates whether the riskiest part of the business is working; treat other metrics as noise unless they change the next action. Identify the business model and stage, and stop measuring a metric that will not change what the team does next.
<!-- vpmodule:atom:end lean-analytics-omtm-focus -->