---
instruction_id: stamp-the-entry-point-on-the-run
title: Stamp the entry point where the run starts
summary: "When several entry points write to one log, stamp the entry point next to the correlation ID at the start of the run and propagate both."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: "More than one entry point, such as a scheduler, a replay endpoint and a manual run, writes into one log sink."
conditions_does_not_apply_when: The run has exactly one entry point.
artifact_contract_output_type: run-attribution
artifact_contract_required_data:
  - the entry points
  - where the field is stamped
  - how it is propagated
artifact_contract_verified_by: a record from each entry point carries the entry-point field set at the start of the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stamp the entry point where the run starts

**When several entry points write to one log, name the entry point.**
A correlation ID identifies a run; it does not say which code path started it.
The same job reached by a scheduler, by a replay endpoint, and by a manual CLI run produces interchangeable lines in one sink, so attributing a line falls back to elimination — cross-reading the scheduler's history, the process table, a deploy log — and that argument holds only as long as those external records happen to still exist.
Stamp the entry point where the run starts, next to the correlation ID, and propagate both the same way:

```typescript
// One helper for every entry point: the run's own logger carries both fields.
// `entryPoint`, not `source` — ECS reserves `source.*` for network fields.
export const runLog = (entryPoint: 'scheduler' | 'replay_endpoint' | 'cli', runId: string) =>
  logger.child({ entryPoint, requestId: runId });
```

Both fields have to cross the same boundaries as the correlation ID — queue metadata, HTTP headers — or a worker re-derives the entry point and guesses.
A field that merely correlates with an entry point is a hint, not an attribution: anything that can invoke the job can reproduce it.
