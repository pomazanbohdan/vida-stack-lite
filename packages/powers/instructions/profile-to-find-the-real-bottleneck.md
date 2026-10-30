---
instruction_id: profile-to-find-the-real-bottleneck
title: Profile to find the real bottleneck
summary: "Measure, identify the actual bottleneck, fix only that, then measure again, and never optimize without evidence of a problem."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Performance requirements exist or slow behaviour is reported.
conditions_does_not_apply_when: No measurement shows a problem at all.
artifact_contract_output_type: bottleneck-report
artifact_contract_required_data:
  - the symptom
  - the measurement
  - the bottleneck
  - the fix that addressed it
artifact_contract_verified_by: the named bottleneck is confirmed by a measurement and not by inspection
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Profile to find the real bottleneck

Measure before optimizing.
Performance work without measurement is guessing — and guessing leads to premature optimization that adds complexity without improving what matters.
Profile first, identify the actual bottleneck, fix it, measure again.
Optimize only what measurements prove matters.

```
1. MEASURE  → Establish baseline with real data
2. IDENTIFY → Find the actual bottleneck (not assumed)
3. FIX      → Address the specific bottleneck
4. VERIFY   → Measure again; keep or revert
5. GUARD    → Add monitoring or tests to prevent regression
```

Fix the one thing Step 2 identified, nothing else.

**Frontend:**

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Slow LCP | Large images, render-blocking resources, slow server | Check network waterfall, image sizes |
| High CLS | Images without dimensions, late-loading content, font shifts | Check layout shift attribution |
| Poor INP | Heavy JavaScript on main thread, large DOM updates | Check long tasks in Performance trace |
| Slow initial load | Large bundle, many network requests | Check bundle size, code splitting |

**Backend:**

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Slow API responses | N+1 queries, missing indexes, unoptimized queries | Check database query log |
| Memory growth | Leaked references, unbounded caches, large payloads | Heap snapshot analysis |
| CPU spikes | Synchronous heavy computation, regex backtracking | CPU profiling |
| High latency | Missing caching, redundant computation, network hops | Trace requests through the stack |
