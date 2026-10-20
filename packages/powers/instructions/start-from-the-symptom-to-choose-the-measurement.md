---
instruction_id: start-from-the-symptom-to-choose-the-measurement
title: Start from the symptom to choose the measurement
summary: "Let the reported symptom decide what you measure first, instead of measuring everything."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Something is reported slow and the place to start measuring is not yet known.
conditions_does_not_apply_when: The bottleneck is already identified by a measurement.
artifact_contract_output_type: measurement-plan
artifact_contract_required_data:
  - the symptom
  - the measurement chosen for it
artifact_contract_verified_by: the chosen measurement follows from the symptom that was reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
status: active
revision: 1
---

# Start from the symptom to choose the measurement

Use the symptom to decide what to measure first:

```
What is slow?
├── First page load
│   ├── Large bundle? --> Measure bundle size, check code splitting
│   ├── Slow server response? --> Measure TTFB in DevTools Network waterfall
│   │   ├── DNS long? --> Add dns-prefetch / preconnect for known origins
│   │   ├── TCP/TLS long? --> Enable HTTP/2, check edge deployment, keep-alive
│   │   └── Waiting (server) long? --> Profile backend, check queries and caching
│   └── Render-blocking resources? --> Check network waterfall for CSS/JS blocking
├── Interaction feels sluggish
│   ├── UI freezes on click? --> Profile main thread, look for long tasks (>50ms)
│   ├── Form input lag? --> Check re-renders, controlled component overhead
│   └── Animation jank? --> Check layout thrashing, forced reflows
├── Page after navigation
│   ├── Data loading? --> Measure API response times, check for waterfalls
│   └── Client rendering? --> Profile component render time, check for N+1 fetches
└── Backend / API
    ├── Single endpoint slow? --> Profile database queries, check indexes
    ├── All endpoints slow? --> Check connection pool, memory, CPU
    └── Intermittent slowness? --> Check for lock contention, GC pauses, external deps
```
