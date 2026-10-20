---
instruction_id: attach-a-correlation-id-to-every-record
title: Attach a correlation ID to every record
summary: "Generate or accept a request ID at the system boundary and carry it on every log line, span and outbound call."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: The code emits telemetry that another system may have to join up.
conditions_does_not_apply_when: The work emits no telemetry at all.
artifact_contract_output_type: correlation-contract
artifact_contract_required_data:
  - where the identifier is generated
  - the records it is attached to
  - the propagation path
artifact_contract_verified_by: one run can be reconstructed from interleaved records by its identifier
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Attach a correlation ID to every record

**Correlation IDs are mandatory.**
Generate (or accept) a request ID at the system boundary and attach it to every log line, span, and outbound call.
Without it, you cannot reconstruct a single request from interleaved logs:

```typescript
// Express: child logger per request, ID propagated downstream
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] ?? crypto.randomUUID();
  req.log = logger.child({ requestId: req.id });
  res.setHeader('x-request-id', req.id);
  next();
});
```
