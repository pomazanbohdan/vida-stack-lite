---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-ab-test
title: Run a statistically valid A/B test
summary: "Calculate sample size from baseline, effect, 80% power and 95% significance; run a full business cycle; never peek or rerun; and report practical as well as statistical significance."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Running or reviewing an A/B or multivariate test.
conditions_does_not_apply_when: A qualitative usability observation with no control group.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Sample size and duration are set before the test, the pre-set result is reported, and an inconclusive result is not buried."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L163-L191"
status: active
revision: 1
---

# Run a statistically valid A/B test

Before an A/B test, calculate required sample size using baseline rate, minimum detectable effect, 80% power, and 95% significance. Run for at least one full business cycle (1–2 weeks), covering weekdays and weekends. Never peek and stop early. Consider practical significance as well as statistical significance; use multivariate testing only with 100,000 or more monthly visitors on a proven winning page. Promote winners to the new control, and value informative failed tests. Set sample size and duration up front, report the pre-set result, never rerun until a desired answer appears, and never bury an inconclusive result.
