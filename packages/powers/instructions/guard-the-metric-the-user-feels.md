---
instruction_id: guard-the-metric-the-user-feels
title: Guard the metric the user feels
summary: "Keep the primary metric under a synthetic build gate and a field monitor, and take a fresh baseline whenever a guard fires."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A performance fix has landed and must not silently regress.
conditions_does_not_apply_when: The change has no user-facing metric.
artifact_contract_output_type: regression-guard
artifact_contract_required_data:
  - the primary metric
  - the synthetic budget
  - the field signal
artifact_contract_verified_by: the primary metric has both a budget check and a field monitor
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
status: active
revision: 1
---

# Guard the metric the user feels

Guard the metric the user actually feels, not every available number.
Use the same LCP, INP, p95 latency, or other primary metric that justified the fix.

Two complementary approaches — use both:

- **Synthetic (Lighthouse, DevTools Performance tab):** Controlled conditions, reproducible. Best for CI regression detection and isolating specific issues.
- **RUM (web-vitals library, CrUX):** Real user data in real conditions. Required to validate that a fix actually improved user experience.

Use two complementary layers when the surface is user-facing:

- **Synthetic CI gate:** Catch reproducible regressions before merge with a performance budget. Repeat noisy measurements or compare a median/trend so normal run-to-run variance does not turn the gate into a flaky check.
- **Field monitoring:** Alert on a meaningful p75 movement in RUM data. Use attributed `web-vitals` data to locate the cause; treat CrUX's rolling window as confirmation rather than an immediate alert.

When either guard fires, return to Step 1 and establish a fresh baseline before proposing another fix.
