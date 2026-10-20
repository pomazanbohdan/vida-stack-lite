---
instruction_id: report-percentiles-not-averages
title: "Report percentiles, not averages"
summary: "Track latency as a histogram and read p50, p95 and p99, because an average hides the users having a terrible time."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: You report a latency or a duration.
conditions_does_not_apply_when: The number counts events rather than measuring a duration.
artifact_contract_output_type: latency-distribution
artifact_contract_required_data:
  - the histogram
  - the percentiles read from it
artifact_contract_verified_by: the reported percentiles are queryable from the stored histogram
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Report percentiles, not averages

Track averages never, percentiles always: an average hides the 1% of users having a terrible time.
Use histograms and read p50/p95/p99.
