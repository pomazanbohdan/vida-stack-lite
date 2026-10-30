---
instruction_id: never-present-an-unmeasured-metric
title: Never present an unmeasured metric
summary: "Never print a performance number that no run produced: mark it not measured, label every value with its source, call static findings potential impact, and never emit a count that was not measured in this session."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "A performance report is written, with or without measurement data."
conditions_does_not_apply_when: The report holds only numbers that a run produced.
artifact_contract_output_type: performance-report
artifact_contract_required_data:
  - metric value or not measured
  - source of every value
  - impact label per finding
artifact_contract_verified_by: every number in the report is backed by a source and every unmeasured field says not measured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/web-performance-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Never present an unmeasured metric
**Never fabricate metrics.** An LLM reading static source code cannot measure real-world LCP, INP, or CLS. If no tool data is provided:

- Return a source-level findings report.
- Mark the entire scorecard as `not measured`.
- Label every finding as `potential impact`, not as a measurement.

When data IS provided, label each scorecard value with its source (`Field`, `Lab`, `Trace`). Field and lab data are not interchangeable: field is what real users experienced, lab is a single synthetic run. Treating them as the same number is a form of fabrication.

Violating this rule is worse than returning no scorecard at all.

Populate the scorecard only with values backed by these sources. Mark unmeasured fields as `not measured`.

If a source is unavailable, do not fabricate. Skip the related section of the scorecard and continue with what you have.

Lead with the scorecard. If not measured, say so explicitly before listing findings.

Do not recommend micro-optimizations without evidence they affect a Core Web Vital or another measurable metric.

## Quick mode (default — no tool artifacts provided)
Scan source code directly for structural anti-patterns.

## Deep mode (activated when tool artifacts or live measurement are available)
In Deep mode, always state which artifacts were provided and which fields remain unmeasured.

Never emit `grep '714 tests'` or `grep '52 test files'` unless you ran the count command in this session. Model-recalled counts are stale from training.
