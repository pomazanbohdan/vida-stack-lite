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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
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
