---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-observability-checklist-md-b2126f5f-c01"
title: "addy-skills: references/observability-checklist.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:references/observability-checklist.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/observability-checklist.md\"}"
atom_ids:
  - alert-on-symptoms-with-a-runbook
  - bound-metric-labels-and-series
  - build-a-dashboard-that-answers-the-on-call-questions
  - gate-the-launch-on-working-telemetry
  - propagate-trace-context-across-every-boundary
  - start-from-the-on-call-questions
  - verify-the-telemetry-before-you-trust-it
  - write-structured-logs-with-a-correlation-id
atom_count: 8
atoms: "[{\"atom_id\":\"alert-on-symptoms-with-a-runbook\",\"file_sha256\":\"87196d6c6423fab100680095d8daa282f5dc7675f2e5a1992ba1f3e221681ec5\",\"content_sha256\":\"71ffad34cfc2dfb43e7795cff50ccb71f6765a945e6f5eaddc99a8e46e6c9aa8\",\"file_bytes\":1830,\"body_bytes\":684},{\"atom_id\":\"bound-metric-labels-and-series\",\"file_sha256\":\"29366b067fd01c9245e973ccaaefeb47c02d97231f9cf6eaedeebfe5a2aacca0\",\"content_sha256\":\"5dd25f956c708df91b7dd5182b28c219c902ae85fe1ee195f61b52518afff859\",\"file_bytes\":1653,\"body_bytes\":596},{\"atom_id\":\"build-a-dashboard-that-answers-the-on-call-questions\",\"file_sha256\":\"af3c17d5e26f0fc85147a826d0fb7e190c0dbcb5f8466055f749904e98f2159b\",\"content_sha256\":\"5d554f5547d6e980731cce612cb51eb3295bf3cc1e28b351d9ee485e60a71ca1\",\"file_bytes\":1495,\"body_bytes\":359},{\"atom_id\":\"gate-the-launch-on-working-telemetry\",\"file_sha256\":\"1e96964be2f17b6fb609f019c3492a02466299de0bae98973720c14110ff9c0d\",\"content_sha256\":\"92c62b567b962405139c42912fca6f4585426e634cd648075e8134426c76b39a\",\"file_bytes\":1554,\"body_bytes\":389},{\"atom_id\":\"propagate-trace-context-across-every-boundary\",\"file_sha256\":\"b28c508479ce7f2670e45a790c8b9fe9c0ac81fd4b85adbe52a42d19507d52d4\",\"content_sha256\":\"0911801b99af6940a85109400983fe0b780aed188c4ffdd04b84283a6ff631b8\",\"file_bytes\":1845,\"body_bytes\":620},{\"atom_id\":\"start-from-the-on-call-questions\",\"file_sha256\":\"97e62f6f8cf6595f7aca5441cf20a5da97d1d83d2e0c24968ae25795570e3a9e\",\"content_sha256\":\"c6414a829f0ce4058df5bcd4406ff77dc42c743de28b7717dbba4fc0ebbdb2ec\",\"file_bytes\":1542,\"body_bytes\":367},{\"atom_id\":\"verify-the-telemetry-before-you-trust-it\",\"file_sha256\":\"5afeed8d19d21650539a6ae3c75b888de8365dea73dd20fe22ee095c2f07743a\",\"content_sha256\":\"e74c4e63ca5d5fba58afd5d5b4d69c0ad0a55581ce3d80a3a3ee951ea9a39b51\",\"file_bytes\":1673,\"body_bytes\":387},{\"atom_id\":\"write-structured-logs-with-a-correlation-id\",\"file_sha256\":\"1d076ee1c8322a88fd201ad6f6f433e6041442a25684682b6b3c15c59ce987f3\",\"content_sha256\":\"3d540b685e59a32661840c547b6a8f8eead54db4235f267747090c72b458de75\",\"file_bytes\":2166,\"body_bytes\":1008}]"
carrier_sha256: 8684d13bde781ba217c09b2eac7f16539016fcb159a3bc212ff0ea3f61729874
carrier_bytes: 14841
revision: 1
status: active
---
<!-- vpmodule:atom:begin alert-on-symptoms-with-a-runbook -->
---
instruction_id: alert-on-symptoms-with-a-runbook
title: "Alert on symptoms, and give every alert a runbook"
summary: "An alert fires on a user-visible symptom, states what to do first, and has been fired once to prove it reaches the right channel."
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: An alert is created or changed on a running service.
conditions_does_not_apply_when: The work emits no alert.
artifact_contract_output_type: alert-review
artifact_contract_required_data:
  - the symptom the alert watches
  - the threshold and its justification
  - the severity
  - the runbook link
  - the test-fire result
artifact_contract_verified_by: the alert was fired once and reached the right channel with a working runbook link
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Alert on symptoms, and give every alert a runbook
Every alert is symptom-based (error rate, p99 latency, queue age) — causes (CPU, disk, restarts) go to dashboards, not pagers
Every alert is actionable; "ignore it, it self-heals" alerts are deleted
Every alert links to a runbook — minimum three lines: what it means, first query to run, escalation path
Thresholds and durations justified by an SLO or historical data, not guesses
Two severities only: **page** (user-facing, act now) and **ticket** (degradation, act this week)
Each new alert test-fired once: it reached the right channel and the runbook link works
No alerts that fire daily and get acknowledged without action
<!-- vpmodule:atom:end alert-on-symptoms-with-a-runbook -->
<!-- vpmodule:atom:begin bound-metric-labels-and-series -->
---
instruction_id: bound-metric-labels-and-series
title: Bound metric labels and series
summary: "Every series is a rate, error or duration, its labels come from a small fixed set, and no label value is unbounded."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: "Metrics are emitted for an endpoint, a dependency or a resource."
conditions_does_not_apply_when: The work emits no metrics.
artifact_contract_output_type: metric-shape-review
artifact_contract_required_data:
  - the metric and its type
  - the label set
  - the cardinality bound
artifact_contract_verified_by: every label value comes from a fixed set and every latency is a histogram
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Bound metric labels and series
**RED** instrumented for every endpoint and every external dependency: Rate, Errors, Duration
**USE** instrumented for every resource (queues, pools, hosts): Utilization, Saturation, Errors
Latency is a histogram; p50/p95/p99 queryable — never an average
All labels come from small, fixed sets (route template, status class, provider name)
No unbounded label values: no user IDs, tenant IDs, emails, raw URLs, request IDs, or error message text
Status codes grouped by class (`5xx`, not `503`)
Queue depth and processing duration tracked for every worker/queue
<!-- vpmodule:atom:end bound-metric-labels-and-series -->
<!-- vpmodule:atom:begin build-a-dashboard-that-answers-the-on-call-questions -->
---
instruction_id: build-a-dashboard-that-answers-the-on-call-questions
title: Build a dashboard that answers the on-call questions
summary: "The dashboard shows error rate, latency, traffic and saturation, and answers the questions written down for the feature instead of everything else."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A dashboard is built for a service or a feature.
conditions_does_not_apply_when: No dashboard is in scope.
artifact_contract_output_type: dashboard-review
artifact_contract_required_data:
  - the questions the dashboard answers
  - the panels and their measures
  - the default time range
artifact_contract_verified_by: each on-call question can be answered from the dashboard as it stands
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Build a dashboard that answers the on-call questions
Service health dashboard exists: error rate, latency p99, traffic, saturation
Dependency health panel shows per-service error rates and latency
Dashboard answers the on-call questions from the top of this checklist — not "everything except the answer"
Default time range is sensible (1h–6h, not 30d)
<!-- vpmodule:atom:end build-a-dashboard-that-answers-the-on-call-questions -->
<!-- vpmodule:atom:begin gate-the-launch-on-working-telemetry -->
---
instruction_id: gate-the-launch-on-working-telemetry
title: Gate the launch on working telemetry
summary: "Before a feature reaches production, its logs flow, its metrics are on a dashboard, one alert is tested, a request can be traced and the runbooks are findable."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A feature is about to be released to production.
conditions_does_not_apply_when: The feature is not going to production.
artifact_contract_output_type: launch-telemetry-gate
artifact_contract_required_data:
  - the log stream
  - the dashboards
  - the test-fired alert
  - the traced request
  - the location of the runbooks
artifact_contract_verified_by: each of the five launch conditions is true for the released build
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Gate the launch on working telemetry
Before a feature ships to production, all of the following are true:
Structured logs flowing to the log aggregator
RED metrics visible in dashboards for every new endpoint and dependency
At least one symptom-based alert configured, with runbook, test-fired
A request can be traced across every service it touches
On-call knows where the runbooks are
<!-- vpmodule:atom:end gate-the-launch-on-working-telemetry -->
<!-- vpmodule:atom:begin propagate-trace-context-across-every-boundary -->
---
instruction_id: propagate-trace-context-across-every-boundary
title: Propagate trace context across every boundary
summary: "Tracing starts at startup and its context is carried on every outbound call and every async boundary, so a request can be followed end to end."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A service or worker makes outbound calls or passes work through a queue.
conditions_does_not_apply_when: The component has no outbound call and no asynchronous boundary.
artifact_contract_output_type: trace-propagation-review
artifact_contract_required_data:
  - the outbound calls that carry the context
  - the async boundaries that carry the context
  - the manual spans
artifact_contract_verified_by: one request is followed end to end with no broken span across the boundaries
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Propagate trace context across every boundary
OpenTelemetry (or equivalent) initialized at service startup, before other imports
Auto-instrumentation enabled for HTTP, gRPC, and DB clients
Trace context propagated on every outbound call (W3C `traceparent`/`tracestate`) and extracted from every inbound request
Context survives async boundaries — queue messages carry trace metadata
Manual spans only around meaningful internal units of work, with the attributes on-call will filter by
No secrets or PII as span attributes
Head-based sampling at a low default rate; 100% of errors kept if tail sampling is available
<!-- vpmodule:atom:end propagate-trace-context-across-every-boundary -->
<!-- vpmodule:atom:begin start-from-the-on-call-questions -->
---
instruction_id: start-from-the-on-call-questions
title: Start from the on-call questions
summary: "Write down the questions an on-call engineer will ask about the feature before instrumenting anything, and match each signal to the question it answers."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A feature is about to be instrumented or its telemetry is being designed.
conditions_does_not_apply_when: No telemetry is being added or changed.
artifact_contract_output_type: on-call-question-set
artifact_contract_required_data:
  - the questions
  - the signal type matched to each question
  - the signals that answer none of them
artifact_contract_verified_by: every signal maps to one of the written questions and every question has a signal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Start from the on-call questions
Telemetry without a question is noise. Before instrumenting anything:
2–4 questions an on-call engineer will ask about this feature are written down
Every signal below maps to one of those questions
Each question is matched to the right signal type: metrics say **that** something is wrong, traces say **where**, logs say **why**
<!-- vpmodule:atom:end start-from-the-on-call-questions -->
<!-- vpmodule:atom:begin verify-the-telemetry-before-you-trust-it -->
---
instruction_id: verify-the-telemetry-before-you-trust-it
title: Verify the telemetry before you trust it
summary: "Instrumentation is code, so it is proven by inducing an error, sending traffic and diagnosing a failure from the telemetry alone."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Telemetry has been added or changed and its behaviour is about to be relied on.
conditions_does_not_apply_when: No telemetry was added or changed.
artifact_contract_output_type: telemetry-verification-record
artifact_contract_required_data:
  - the induced error and where it was found
  - the test traffic and the series it produced
  - the request followed end to end
  - the failure diagnosed from telemetry alone
artifact_contract_verified_by: all four checks were run against the current build and the induced failure was diagnosed without reading the source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Verify the telemetry before you trust it
Instrumentation is code; it can be wrong:
Forced an error in staging → found it in the logs by correlation ID
Sent test traffic → metric series appear with expected labels and sane values
Followed one request end-to-end in the tracing UI → no broken spans
An induced failure was diagnosed from telemetry alone, without reading the source
<!-- vpmodule:atom:end verify-the-telemetry-before-you-trust-it -->
<!-- vpmodule:atom:begin write-structured-logs-with-a-correlation-id -->
---
instruction_id: write-structured-logs-with-a-correlation-id
title: Write structured logs with a correlation id
summary: "Log lines are structured events with stable names, a correlation id that travels with the request, and no secrets or raw bodies."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A component writes logs that another person will have to read.
conditions_does_not_apply_when: The component produces no logs.
artifact_contract_output_type: logging-standard
artifact_contract_required_data:
  - the event names
  - the correlation id source
  - the allowlisted fields
  - the level meanings
artifact_contract_verified_by: a real log line shows the structured fields and the correlation id rather than an object dump
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Write structured logs with a correlation id
Logs are structured (JSON) with stable event names — not free-form strings
Every log line carries a correlation/request ID, generated or accepted at the system boundary
Correlation ID is propagated on every outbound call and async boundary (HTTP headers, queue metadata)
Any log stream written by more than one entry point (scheduler, replay endpoint, manual run) carries an entry-point field, set where the run starts and propagated alongside the correlation ID
Log levels are consistent: `error` = invariant broken, someone may act; `warn` = degraded but handled; `info` = significant business event; `debug` = off in production
No secrets, tokens, passwords, or unredacted PII in any log line
Fields are allowlisted — no whole request/response bodies, no auth headers
External service calls logged with metadata only: endpoint, status, latency, attempt count, sanitized identifiers
Actual log output spot-checked: structured fields, not `[object Object]`
<!-- vpmodule:atom:end write-structured-logs-with-a-correlation-id -->