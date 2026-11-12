---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-observability-and-instrumentation-skill-md-4b8b8114-c01"
title: "addy-skills: skills/observability-and-instrumentation/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/observability-and-instrumentation/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/observability-and-instrumentation/SKILL.md\"}"
atom_ids:
  - alert-on-symptoms-not-causes
  - attach-a-correlation-id-to-every-record
  - bound-the-cardinality-of-metric-labels
  - choose-the-signal-that-answers-the-question
  - instrument-red-metrics-on-every-endpoint
  - keep-runbooks-current
  - keep-secrets-out-of-telemetry
  - log-structured-events-not-prose
atom_count: 8
atoms: "[{\"atom_id\":\"alert-on-symptoms-not-causes\",\"file_sha256\":\"22313e273202d04757b0837ac622ac9b056ef6de15678ef94d9b8501de8a7639\",\"content_sha256\":\"322759d496752594c8b4a33ddd70bd4af8b11c801189a5ca449bb4b3e1330285\",\"file_bytes\":1506,\"body_bytes\":474},{\"atom_id\":\"attach-a-correlation-id-to-every-record\",\"file_sha256\":\"ccd814546f646bddd277688441079b7ed46474339f013a7abd6d74f2b89aa54e\",\"content_sha256\":\"859e0059de571eeaf283b0d9b7de285a4174bc71732d534bc285f2361cc819ab\",\"file_bytes\":1680,\"body_bytes\":547},{\"atom_id\":\"bound-the-cardinality-of-metric-labels\",\"file_sha256\":\"bd78a6fd451be5190ba46882c8213d4b02f4d5c9c8c1bd6f056a288dc326238a\",\"content_sha256\":\"a9f37e7dfd3af210cab5b60ca8bcda1120fc42116060633d85c70e84e5bf81cb\",\"file_bytes\":1519,\"body_bytes\":505},{\"atom_id\":\"choose-the-signal-that-answers-the-question\",\"file_sha256\":\"b13534239b18ce6e1d237f4f870d3bc386e2d7a9a910b8f9492f9fe865a27070\",\"content_sha256\":\"94732f7cf4670329390e2109318094365ed311bc88a3bbfddbc2c986a29b2149\",\"file_bytes\":1643,\"body_bytes\":523},{\"atom_id\":\"instrument-red-metrics-on-every-endpoint\",\"file_sha256\":\"41e422c0be34902e82161995b5ec37c5a2b488bbc014ea8975bee1845409ec91\",\"content_sha256\":\"693634de04de87bafda06adf14c2b8eecf0cd3cad2c3c002b4f56895ff399241\",\"file_bytes\":1517,\"body_bytes\":336},{\"atom_id\":\"keep-runbooks-current\",\"file_sha256\":\"530bc31f7e42450ccb1f59462d448763250f0ab206c2485784ad28f36afc8036\",\"content_sha256\":\"b16be1c6b8b3a085c85c15608dee240b50a1843e5d563e400c958fea2c146867\",\"file_bytes\":1226,\"body_bytes\":245},{\"atom_id\":\"keep-secrets-out-of-telemetry\",\"file_sha256\":\"b01d9a45aeccf59c0e9f9639ebac4c3e800e331c1bf587dfa9ca6c51eaa4a196\",\"content_sha256\":\"bbeeda702d2a783b4794b2e7d11b9b316254992674b03d2523917b1a351e0b52\",\"file_bytes\":1376,\"body_bytes\":293},{\"atom_id\":\"log-structured-events-not-prose\",\"file_sha256\":\"88fb759aa6f3fca0ece156150e4f42c793648c9935d2a289787868b0fe1e3c2e\",\"content_sha256\":\"19dea661caa5007eaa19c5c3eb42891a388b4850c1496980fd5f9fcf83221e17\",\"file_bytes\":1569,\"body_bytes\":485}]"
carrier_sha256: 02100687f8f5ae49ba72aa659143fde15471500295bcdbcbc0020952e0626e9f
carrier_bytes: 13037
revision: 1
status: active
---
<!-- vpmodule:atom:begin alert-on-symptoms-not-causes -->
---
instruction_id: alert-on-symptoms-not-causes
title: "Alert on symptoms users feel, not on causes"
summary: "Page on the error rate and the latency the user experiences, and keep the resource causes on a dashboard."
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: You write or review an alert rule.
conditions_does_not_apply_when: The rule is a dashboard panel that never notifies anyone.
artifact_contract_output_type: alert-rule
artifact_contract_required_data:
  - the symptom
  - the threshold
  - the duration
artifact_contract_verified_by: the rule fires on the user-visible symptom and not on the cause
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
  - operations
---

# Alert on symptoms users feel, not on causes

Alert on **symptoms users feel**, not on causes:

```
SYMPTOM (page-worthy):           CAUSE (dashboard, not a page):
error rate > 1% for 5 min        CPU at 85%
p99 latency > 2s                 one pod restarted
queue age > 10 min               disk at 70%
```

Cause-based alerts fire when nothing is wrong and miss failures you didn't predict.
Symptom-based alerts fire exactly when users are hurt, regardless of the cause.
<!-- vpmodule:atom:end alert-on-symptoms-not-causes -->
<!-- vpmodule:atom:begin attach-a-correlation-id-to-every-record -->
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
<!-- vpmodule:atom:end attach-a-correlation-id-to-every-record -->
<!-- vpmodule:atom:begin bound-the-cardinality-of-metric-labels -->
---
instruction_id: bound-the-cardinality-of-metric-labels
title: Bound the cardinality of metric labels
summary: "Labels come from small fixed sets, and unbounded values belong in logs and traces instead."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: You add a label to a metric series.
conditions_does_not_apply_when: The label value is a small fixed set by construction.
artifact_contract_output_type: label-set
artifact_contract_required_data:
  - the allowed labels
  - the values that must never be labels
artifact_contract_verified_by: every label value comes from a bounded set
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
  - operations
---

# Bound the cardinality of metric labels

**Cardinality is the failure mode.**
Every unique label combination is a separate time series.
Labels must come from small, fixed sets (route template, status class, provider name).
Never use user IDs, raw URLs, error messages, or other unbounded values as labels — that belongs in logs and traces.

```
OK as label:    route="/api/tasks/:id"   status_class="5xx"   provider="stripe"
NEVER a label:  user_id, email, request_id, full URL, error message text
```
<!-- vpmodule:atom:end bound-the-cardinality-of-metric-labels -->
<!-- vpmodule:atom:begin choose-the-signal-that-answers-the-question -->
---
instruction_id: choose-the-signal-that-answers-the-question
title: Choose the signal that answers the question
summary: "Match the signal to the question: a structured log for what happened, a metric for how often and how fast, a trace for where the time went."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A question has been named and the kind of signal still has to be chosen.
conditions_does_not_apply_when: The platform fixes the signal type for the question.
artifact_contract_output_type: signal-choice
artifact_contract_required_data:
  - the question
  - the signal
  - its cost profile
artifact_contract_verified_by: each written question is answered by exactly one kind of signal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Choose the signal that answers the question

## Pick the right signal for each question

| Signal | Answers | Cost profile |
|---|---|---|
| **Structured log** | "What happened in this specific case?" | Per-event; grows with traffic |
| **Metric** | "How often / how fast, in aggregate?" | Fixed per series; cheap to query |
| **Trace** | "Where did time go across services?" | Per-request; usually sampled |

Rule of thumb: metrics tell you **that** something is wrong, traces tell you **where**, logs tell you **why**.
<!-- vpmodule:atom:end choose-the-signal-that-answers-the-question -->
<!-- vpmodule:atom:begin instrument-red-metrics-on-every-endpoint -->
---
instruction_id: instrument-red-metrics-on-every-endpoint
title: Instrument RED metrics on every endpoint
summary: "Every request-driven endpoint and every external dependency gets rate, errors and duration; resources get utilization, saturation and errors."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: The code serves requests or depends on a remote service.
conditions_does_not_apply_when: The code is a batch job with no request traffic and no external dependency.
artifact_contract_output_type: metric-set
artifact_contract_required_data:
  - the endpoints
  - the external dependencies
  - the three measures of each
artifact_contract_verified_by: each new endpoint and dependency exposes its three measures with bounded label sets
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

# Instrument RED metrics on every endpoint

For request-driven services, instrument **RED** on every endpoint and every external dependency: **R**ate (requests/sec), **E**rrors (failure rate), **D**uration (latency histogram, not average).
For resources (queues, pools, hosts), use **USE**: **U**tilization, **S**aturation, **E**rrors.
<!-- vpmodule:atom:end instrument-red-metrics-on-every-endpoint -->
<!-- vpmodule:atom:begin keep-runbooks-current -->
---
instruction_id: keep-runbooks-current
title: Keep the runbook current
summary: Fix the runbook while closing the incident it was used in.
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: An incident is being closed and a runbook was used during it.
conditions_does_not_apply_when: No incident is being closed.
artifact_contract_output_type: runbook-update
artifact_contract_required_data:
  - the incident
  - the step that was wrong or missing
  - the correction
artifact_contract_verified_by: the runbook is corrected before the incident is marked resolved
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
  - operations
---

# Keep the runbook current

**Keep runbooks current.**
Update the runbook as part of closing every incident it was used in — a stale runbook builds false confidence.
If a step was wrong or missing, fix it before marking the incident resolved.
<!-- vpmodule:atom:end keep-runbooks-current -->
<!-- vpmodule:atom:begin keep-secrets-out-of-telemetry -->
---
instruction_id: keep-secrets-out-of-telemetry
title: Keep secrets and personal data out of telemetry
summary: "Allowlist the fields you emit and never log secrets, tokens, passwords or full personal data."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - data-minimization
conditions_applies_when: "You add or review a log line, a metric field, a span attribute or a trace payload."
conditions_does_not_apply_when: The telemetry carries no sensitive value.
artifact_contract_output_type: field-allowlist
artifact_contract_required_data:
  - the allowed fields
  - the rejected fields
artifact_contract_verified_by: "the actual emitted output contains no secret, token or unredacted personal value"
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

# Keep secrets and personal data out of telemetry

**Never log secrets, tokens, passwords, or full PII.**
Telemetry pipelines are a classic data-leak path.
Allowlist fields; don't log whole request bodies.
- [ ] No secrets, tokens, or unredacted PII in any log line (spot-check actual output)
<!-- vpmodule:atom:end keep-secrets-out-of-telemetry -->
<!-- vpmodule:atom:begin log-structured-events-not-prose -->
---
instruction_id: log-structured-events-not-prose
title: "Log structured events, not prose"
summary: Every log line is a structured record with a stable event name and machine-readable fields.
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: You add logging to a code path that runs in production.
conditions_does_not_apply_when: The output is a human-facing report rather than telemetry.
artifact_contract_output_type: structured-log-record
artifact_contract_required_data:
  - the event name
  - the machine-readable fields
  - the log level
artifact_contract_verified_by: a line from the new path is queryable by its event name and its fields
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

# Log structured events, not prose

Log events, not prose.
Every log line is a JSON object with a stable event name and machine-readable fields:

```typescript
// BAD: string interpolation — unqueryable, inconsistent
logger.info(`Payment ${id} failed for user ${userId} after ${n} retries`);

// GOOD: stable event name + structured fields
logger.warn({
  event: 'payment_failed',
  paymentId: id,
  provider: 'stripe',
  errorCode: err.code,
  attempt: n,
}, 'payment failed');
```
<!-- vpmodule:atom:end log-structured-events-not-prose -->