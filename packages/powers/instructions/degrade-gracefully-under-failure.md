---
instruction_id: degrade-gracefully-under-failure
title: Degrade gracefully under failure
summary: "Under time pressure, return a safe default or a degraded result instead of crashing, and report the fallback."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A call can fail at runtime and a fallback is preferable to a crash.
conditions_does_not_apply_when: "The failure must abort the operation, for example a failed authorization."
artifact_contract_output_type: fallback-behaviour
artifact_contract_required_data:
  - the safe default
  - the warning or log that reports it
  - the degraded result
artifact_contract_verified_by: the failure path returns a value and reports what it did
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/debugging-and-error-recovery/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/embeddable-orchestration-system.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/host-integration-interface.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/security-model.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Degrade gracefully under failure

When under time pressure, use safe fallbacks:

```typescript
// Safe default + warning (instead of crashing)
function getConfig(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.warn(`Missing config: ${key}, using default`);
    return DEFAULTS[key] ?? '';
  }
  return value;
}

// Graceful degradation (instead of broken feature)
function renderChart(data: ChartData[]) {
  if (data.length === 0) {
    return <EmptyState message="No data available for this period" />;
  }
  try {
    return <Chart data={data} />;
  } catch (error) {
    console.error('Chart render failed:', error);
    return <ErrorState message="Unable to display chart" />;
  }
}
```
- A host declares the interface version it targets; the engine negotiates down to `min(host, engine)` rather than refusing to talk. A host newer than the running engine gets a warning, not a crash — its declared axes beyond the engine's version are simply not trusted.
- A negotiated concurrency limit degrades to `1` (strictly sequential) on anything other than a positive safe integer (missing, an undocumented value, zero, negative, fractional, an unsafe integer, or a non-numeric type).
- A caller may decide how to degrade on rejection, never whether a path is contained.
