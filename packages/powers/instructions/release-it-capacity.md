---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-capacity
title: Model capacity and test past peak
summary: "Measure the first bottleneck across CPU, memory, network, disk, pools and threads; run load, stress, soak and spike tests; size pools from measured concurrency and load test to twice peak."
capability_tags:
  - design-production-readiness
pattern_tags:
  - capacity-model
conditions_applies_when: Capacity planning or pool sizing.
conditions_does_not_apply_when: A system with no traffic model.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The bottleneck, load test to 2x peak, soak window and pool sizing evidence are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L76-L98"
status: active
revision: 1
---

# Model capacity and test past peak

Capacity is a multi-dimensional function of CPU, memory, network, disk I/O, connection pools, and threads; capacity planning means knowing which resource bottlenecks first and at what load, using actual (not theoretical) measured limits. Test taxonomy is mandatory coverage: load test (expected traffic), stress test (beyond limits), soak test (sustained, catches leaks), spike test (sudden bursts); throughput never scales linearly (Universal Scalability Law: contention and coherence costs cause diminishing returns); pool exhaustion looks identical to a database outage from the application's perspective, so size pools from measured concurrency, not defaults; auto-scaling has lag, cold starts, and hard limits — 'the cloud is infinitely scalable' is a myth. Concrete norms: ramp load to peak then 2x while observing degradation, increasing RPS until latency exceeds SLO; size connection pools to P99 active connections + 20% headroom; soak test at 80% capacity for 24-72 hours to catch memory/connection/file-handle leaks; document the bottleneck per service (e.g. 'memory-bound at 2000 RPS; 4GB per instance').
