---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-observability-and-instrumentation-skill-md-4b8b8114-c02"
title: "addy-skills: skills/observability-and-instrumentation/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/observability-and-instrumentation/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/observability-and-instrumentation/SKILL.md\"}"
atom_ids:
  - make-every-alert-actionable
  - name-the-questions-before-instrumenting
  - propagate-trace-context-across-every-async-boundary
  - report-percentiles-not-averages
  - stamp-the-entry-point-on-the-run
  - use-log-levels-by-their-meaning
  - verify-the-telemetry-you-added
  - write-a-minimum-viable-runbook
atom_count: 8
atoms: "[{\"atom_id\":\"make-every-alert-actionable\",\"file_sha256\":\"5b174d6136c1963a3e1a8d62ba6f4ae25c5d89d337056e74411a38f5a6dc8fb6\",\"content_sha256\":\"f46914490a0d7fb3def0107523359b0cc65847ccc9224a35dfb9bbf6a2346a75\",\"file_bytes\":1636,\"body_bytes\":536},{\"atom_id\":\"name-the-questions-before-instrumenting\",\"file_sha256\":\"3c67e5f2371edcc85bffa10afaa29992474195b6b22a972f0509867de75417aa\",\"content_sha256\":\"b79e6f3332c55d7e2e2eaa8f6d1a2e9f3b1e931a0d24e8cdce6c5a2844690372\",\"file_bytes\":2233,\"body_bytes\":1017},{\"atom_id\":\"propagate-trace-context-across-every-async-boundary\",\"file_sha256\":\"e189713cec315200e8d3c79b8c322bfb6ce51a8de77126386bdf4330fc5d5e4f\",\"content_sha256\":\"a039ec929f52d653390bde57404f4ce0a4236b634659d6fb421b79f7a6cbac2e\",\"file_bytes\":2103,\"body_bytes\":927},{\"atom_id\":\"report-percentiles-not-averages\",\"file_sha256\":\"5620998a68f9c40ca1e63dc1c60fdf5fce33177858e158df5f3e3f3711cd5302\",\"content_sha256\":\"e4b6e327b099211093e0e38c05d54b43c72824ce85b1a3733790ea44607e8ac2\",\"file_bytes\":1217,\"body_bytes\":172},{\"atom_id\":\"stamp-the-entry-point-on-the-run\",\"file_sha256\":\"fd0154954fb277b0791d8d0a37dcca487471419d7184eb57c0a52f0dca667431\",\"content_sha256\":\"90e717c8e9bd5e81a8b52cfabd7288316bc05318abd0e04c7fd1a8e76ea406ac\",\"file_bytes\":2449,\"body_bytes\":1251},{\"atom_id\":\"use-log-levels-by-their-meaning\",\"file_sha256\":\"d013dc4b8e55ee4bb7829231c70d8b5b0e29b157128bcfc47c5566948401e437\",\"content_sha256\":\"37b7571cb64b6ca5a2afc81fb010e74e779e8b9c3538188e8e2db3a5404964c3\",\"file_bytes\":1485,\"body_bytes\":420},{\"atom_id\":\"verify-the-telemetry-you-added\",\"file_sha256\":\"dd0e50b6b0e7eb55992f46d95c96e0461013b94bd521b51657f857633a60e97d\",\"content_sha256\":\"381908d450585e9da94491c1e193b8bc0ab5af2b99070990f7db3b736bf911ea\",\"file_bytes\":1677,\"body_bytes\":576},{\"atom_id\":\"write-a-minimum-viable-runbook\",\"file_sha256\":\"7b1b6a55a416300290435de9627f8feae4bdd15fe5ab1132158b06484fe3daba\",\"content_sha256\":\"06a387f703d24600d8f835ec5cb4e06865b0618d7735925f569d5fdde10bec77\",\"file_bytes\":1910,\"body_bytes\":893}]"
carrier_sha256: a4dd7c63a313a1f337dfbaa2675ed3f7b8f7975b08b3ea2a147f2a1bae955bbe
carrier_bytes: 15715
revision: 1
status: active
---
<!-- vpmodule:atom:begin make-every-alert-actionable -->
---
instruction_id: make-every-alert-actionable
title: Make every alert actionable
summary: "An alert that needs no action is deleted, and the rest carry a threshold, a duration, a severity and a runbook link."
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: You create an alert rule or review an existing one.
conditions_does_not_apply_when: The signal is a dashboard panel and never notifies anyone.
artifact_contract_output_type: alert-rule-review
artifact_contract_required_data:
  - the severity
  - the threshold
  - the duration
  - the runbook link
artifact_contract_verified_by: "every alert has a justified threshold, a duration, one of the two severities and a runbook"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Make every alert actionable

Rules for every alert you create:

1. **It must be actionable.** If the response is "ignore it, it self-heals", delete the alert.
2. **It links to a runbook** — even three lines: what it means, first query to run, escalation path.
3. **It has a threshold and duration** justified by the SLO or by historical data, not by a guess.
4. Use two severities only: **page** (user-facing, act now) and **ticket** (degradation, act this week). A third tier becomes noise that trains people to ignore everything.
<!-- vpmodule:atom:end make-every-alert-actionable -->
<!-- vpmodule:atom:begin name-the-questions-before-instrumenting -->
---
instruction_id: name-the-questions-before-instrumenting
title: Name the questions before you instrument
summary: "Write down the questions an on-call engineer will ask about the feature, and let every signal answer one of them."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: "A feature, service, endpoint, job or integration is about to be built or changed and it will run in production."
conditions_does_not_apply_when: The work is a local script or a one-off analysis that no on-call engineer will ever look at.
artifact_contract_output_type: on-call-question-set
artifact_contract_required_data:
  - the feature
  - the two to four questions
  - the signal that answers each question
artifact_contract_verified_by: every planned signal maps to one of the written questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Name the questions before you instrument

Code you can't observe is code you can't operate.
Observability is the ability to answer "what is the system doing and why?" from the outside, using the telemetry the code emits.
Instrumentation is not a post-launch add-on — it's written alongside the feature, the same way tests are.
If a feature ships without telemetry, the first user-reported bug becomes archaeology instead of a query.
Telemetry without a question is noise.
Before adding any instrumentation, write down 2–4 questions an on-call engineer will ask about this feature:

```
FEATURE: checkout payment retry
QUESTIONS ON-CALL WILL ASK:
1. What fraction of payments succeed on first attempt vs after retry?
2. When a payment fails permanently, why? (provider error? timeout? validation?)
3. Is the payment provider slower than usual?
→ Every signal below must help answer one of these.
```

If you can't name the questions, you're not ready to instrument — you'll log everything and learn nothing.
<!-- vpmodule:atom:end name-the-questions-before-instrumenting -->
<!-- vpmodule:atom:begin propagate-trace-context-across-every-async-boundary -->
---
instruction_id: propagate-trace-context-across-every-async-boundary
title: Propagate trace context across every async boundary
summary: "Carry the trace across every async boundary and span only meaningful units of work, with the attributes on-call will filter by."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: "The work crosses services, queues or other asynchronous boundaries."
conditions_does_not_apply_when: The work runs entirely inside one synchronous call.
artifact_contract_output_type: trace-contract
artifact_contract_required_data:
  - the async boundaries
  - the spans
  - the span attributes
  - the sampling rate
artifact_contract_verified_by: one request can be followed across the boundaries without a broken span
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Propagate trace context across every async boundary

Use OpenTelemetry — it's the vendor-neutral standard, and auto-instrumentation covers HTTP, gRPC, and common DB clients with near-zero code:

```typescript
// tracing.ts — must be imported before anything else
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'checkout-service',
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

Add manual spans only around meaningful internal units of work (e.g., `applyDiscounts`, `chargeProvider`) and attach the attributes on-call will filter by.
Propagate context across every async boundary — HTTP headers, queue message metadata — or the trace dies at the gap.
Sample head-based at a low rate by default; keep 100% of errors if your backend supports tail sampling.
<!-- vpmodule:atom:end propagate-trace-context-across-every-async-boundary -->
<!-- vpmodule:atom:begin report-percentiles-not-averages -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report percentiles, not averages

Track averages never, percentiles always: an average hides the 1% of users having a terrible time.
Use histograms and read p50/p95/p99.
<!-- vpmodule:atom:end report-percentiles-not-averages -->
<!-- vpmodule:atom:begin stamp-the-entry-point-on-the-run -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
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
<!-- vpmodule:atom:end stamp-the-entry-point-on-the-run -->
<!-- vpmodule:atom:begin use-log-levels-by-their-meaning -->
---
instruction_id: use-log-levels-by-their-meaning
title: Use log levels by their meaning
summary: "Each level carries one meaning and one on-call action, and the level is chosen from that meaning."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: You write a log statement and choose its level.
conditions_does_not_apply_when: "The level is dictated by the logging framework's own policy."
artifact_contract_output_type: level-policy
artifact_contract_required_data:
  - the level
  - its meaning
  - the on-call action it triggers
artifact_contract_verified_by: every new log statement uses the level that matches its meaning
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Use log levels by their meaning

Log levels — use them consistently:

| Level | Meaning | On-call action |
|---|---|---|
| `error` | Invariant broken; someone may need to act | Investigate |
| `warn` | Degraded but handled (retry succeeded, fallback used) | Watch for trends |
| `info` | Significant business event (order placed, job finished) | None |
| `debug` | Diagnostic detail | Off in production by default |
<!-- vpmodule:atom:end use-log-levels-by-their-meaning -->
<!-- vpmodule:atom:begin verify-the-telemetry-you-added -->
---
instruction_id: verify-the-telemetry-you-added
title: Verify the telemetry you added
summary: Trigger the paths and look at the real output before calling the instrumentation done.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "You have added logging, metrics, traces or alerts and are about to call the work done."
conditions_does_not_apply_when: Nothing was instrumented.
artifact_contract_output_type: telemetry-verification
artifact_contract_required_data:
  - the induced failure
  - the record that was found
  - the alert that was fired
artifact_contract_verified_by: "an induced failure is located through telemetry alone, without reading the source"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Verify the telemetry you added

Instrumentation is code; it can be wrong.
Before calling the work done, trigger the paths and look at the actual output:

- Force an error in staging → find it in the logs by `requestId`, confirm fields are structured (not `[object Object]`)
- Send test traffic → confirm metric series appear with the expected labels and sane values
- Follow one request across services in the tracing UI → no broken spans
- Fire each new alert once (lower the threshold temporarily) → confirm it reaches the right channel and the runbook link works
<!-- vpmodule:atom:end verify-the-telemetry-you-added -->
<!-- vpmodule:atom:begin write-a-minimum-viable-runbook -->
---
instruction_id: write-a-minimum-viable-runbook
title: Write a minimum viable runbook
summary: "The runbook answers what is happening, what to check first and who to call, in three lines."
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: "An alert needs a runbook, or an existing runbook has grown too long."
conditions_does_not_apply_when: No alert points at the runbook.
artifact_contract_output_type: runbook
artifact_contract_required_data:
  - what it means
  - the first check
  - the escalation path
artifact_contract_verified_by: the reader can act on the runbook without having to think
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write a minimum viable runbook

A runbook's job is to answer three questions without requiring the reader to think: what is happening, what to check first, and who to call if that doesn't resolve it.
Store it named after the alert.

**Minimum viable runbook (three lines):**

```markdown
# Runbook: High Error Rate on /api/tasks
**Means:** DB connection pool likely exhausted, or a bad deploy.
**First check:** `SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend';`
  — if count > pool limit, see Step 2. (Swap in the equivalent for your database.)
**Escalate to:** #db-oncall or engineering on-call rotation.
```

**When to expand beyond three lines:** add steps only when the first check alone isn't enough to decide.
A five-step runbook that covers the three most common causes is better than a twenty-step document that covers every edge case and gets skimmed.
<!-- vpmodule:atom:end write-a-minimum-viable-runbook -->