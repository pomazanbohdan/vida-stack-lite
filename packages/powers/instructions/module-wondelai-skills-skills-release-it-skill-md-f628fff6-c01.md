---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-release-it-skill-md-f628fff6-c01"
title: "wondelai-skills: skills/release-it/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/release-it/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/release-it/SKILL.md\"}"
atom_ids:
  - release-it-anti-patterns
  - release-it-capacity
  - release-it-chaos
  - release-it-common-mistakes
  - release-it-core
  - release-it-deployment
  - release-it-observability
  - release-it-quick-diagnostic
atom_count: 8
atoms: "[{\"atom_id\":\"release-it-anti-patterns\",\"file_sha256\":\"0ffb2ffe625362f8c0643192de8713e3371f12dc86a8437c4ba3d407ceaf0c88\",\"content_sha256\":\"b3648b129c4de99ac349e9ed7ad3919d60d6d2e4c5194f5e7d9e8f644f6a224e\",\"file_bytes\":2294,\"body_bytes\":1145},{\"atom_id\":\"release-it-capacity\",\"file_sha256\":\"53d75fa4681a1431b6de4ae5aff4005c079b7fa69b70d29493a1f9785311a505\",\"content_sha256\":\"b4f4f36cb89574ad11bb56af1d1774fe15a0d233154229a3871dec01b6193650\",\"file_bytes\":2290,\"body_bytes\":1156},{\"atom_id\":\"release-it-chaos\",\"file_sha256\":\"61d90de5de6c205e9dfd265985f9e9822f035dbc2efa2a44d1aae6d0f88a0998\",\"content_sha256\":\"da4c1548ea5c57c47b3446d7dd9a668893b9637d20afc135fe2d467baea7214b\",\"file_bytes\":2497,\"body_bytes\":1318},{\"atom_id\":\"release-it-common-mistakes\",\"file_sha256\":\"6d0cbb6913f860dfb7e054e021a854f3a3c3109ffa4b6bfc95776ff0e5432328\",\"content_sha256\":\"226bcfe35e3f037c334323e7cbc35fd02d619501eab34b422ddb2729bcc66225\",\"file_bytes\":2289,\"body_bytes\":1150},{\"atom_id\":\"release-it-core\",\"file_sha256\":\"01f6afd540cc15a2560721e529841d9cdb6d740a2676ec82545719c002673ba2\",\"content_sha256\":\"5078abf382bc725a6f879a88ae93c69afaeb0b1baff157906e5dc417bc95b4d7\",\"file_bytes\":1514,\"body_bytes\":381},{\"atom_id\":\"release-it-deployment\",\"file_sha256\":\"16c9e25932b730be6855c4855a0add2ab6d52f518932386244744726847efdf9\",\"content_sha256\":\"6e583d9c8925a71c5e2687339a8aea3d5c8f0073f6b28d147ffb82743c71629e\",\"file_bytes\":2291,\"body_bytes\":1112},{\"atom_id\":\"release-it-observability\",\"file_sha256\":\"3efba3fcda348ec0782ec26660baee38248276077ce0552522ba78dca5100567\",\"content_sha256\":\"c446166c95478450693fc0b3f15fb8664dd162c4348dc910b038f4e5ef5eb090\",\"file_bytes\":2513,\"body_bytes\":1335},{\"atom_id\":\"release-it-quick-diagnostic\",\"file_sha256\":\"67f585cc3b57ba9de4ca5186476df386626e75435da7e5b70f84792ffeb159e6\",\"content_sha256\":\"41afd07baf63f9c8c64a95ac3dd5fed311ed5852fab2d611ad277e61c6315eb2\",\"file_bytes\":2142,\"body_bytes\":941}]"
carrier_sha256: 9cf876011b8a734651ab5dd0736be8eb3443552038ab9b0d557b1d8bfe28903c
carrier_bytes: 18637
revision: 1
status: active
---
<!-- vpmodule:atom:begin release-it-anti-patterns -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-anti-patterns
title: Audit stability anti-patterns
summary: "Walk every integration point and name the failure pattern it enables; guard remote calls with timeout and breaker, limit result sets, isolate pools and coordinate launch load with capacity."
capability_tags:
  - design-production-readiness
pattern_tags:
  - stability-anti-pattern
conditions_applies_when: Triaging an outage or hardening an integration point.
conditions_does_not_apply_when: A system with no integration points.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every integration point has a named anti-pattern and a specific guard.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L26-L49"
status: active
revision: 1
---

# Audit stability anti-patterns

Failures propagate through integration points and cascade across system boundaries; audit by walking every integration point (every socket, HTTP call, or queue) and asking which anti-pattern it currently enables, then close that specific crack rather than hardening at random. Binding guards: assume every remote call can fail, hang, or return garbage and wrap all external calls with timeout + circuit breaker; enforce result-set limits (add LIMIT, paginate all list endpoints); isolate pools per dependency (separate pool for payment gateway vs. search); coordinate marketing/launch events with capacity planning (pre-scale before events like Black Friday, queue coupon redemptions). Slow responses are worse than no response because they tie up threads, exhaust pools, and propagate delay up the call chain; unbounded result sets turn a harmless query into an out-of-memory crash once data outgrows test assumptions; users generate unpredictable load (bots, retry storms, flash crowds, self-denial from your own marketing); blocked threads from deadlocks and contention show no errors until everything stops.
<!-- vpmodule:atom:end release-it-anti-patterns -->
<!-- vpmodule:atom:begin release-it-capacity -->
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
<!-- vpmodule:atom:end release-it-capacity -->
<!-- vpmodule:atom:begin release-it-chaos -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-chaos
title: Plan failure injection safely
summary: "Treat chaos engineering as design-time planning: define steady state and hypothesis, start small outside production, require authorized engineers, approvals, blast-radius controls and rollback, and escalate gradually."
capability_tags:
  - design-production-readiness
pattern_tags:
  - chaos-safety
conditions_applies_when: Designing a failure experiment or GameDay.
conditions_does_not_apply_when: Autonomous failure injection by an agent.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The experiment is planned with authorization, approvals, rollback and blast-radius controls."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L147-L173"
status: active
revision: 1
---

# Plan failure injection safely

Chaos engineering is a design-time planning activity: the patterns describe what to test and what to verify, not actions an AI agent may execute autonomously. All failure injection must be performed by authorized engineers using dedicated tooling such as Gremlin, Litmus, or AWS FIS, with proper approvals, rollback plans, and blast-radius controls. Build resilience confidence by testing realistic failures in controlled experiments: define a measurable steady state first, state a hypothesis of the form that when X fails the system will Y, start small in non-production by killing one process or adding latency to one call, and escalate gradually with approvals. Minimize blast radius with canary populations, feature flags, and an emergency stop; production experiments require explicit authorization and instant rollback. Automate recurring experiments and use GameDay exercises to test both the system and the team. Foster a culture where finding weaknesses is celebrated, not punished. Representative experiments include controlled process termination verified against SLO recovery, +500ms latency on database calls to verify circuit-breaker trip, a simulated downstream 503 to verify graceful degradation, and a scheduled GameDay such as a primary database becoming read-only.
<!-- vpmodule:atom:end release-it-chaos -->
<!-- vpmodule:atom:begin release-it-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-common-mistakes
title: Avoid the listed production mistakes
summary: "Avoid missing timeouts, unbounded retries, shared pools, shallow health checks, happy-path testing, coupled deploy and release, cause-based alerts and no capacity model; apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a production system for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L174-L186"
status: active
revision: 1
---

# Avoid the listed production mistakes

Eight named failure modes with their fixes (normative checklist): (1) No timeouts on outbound calls — one slow dependency freezes the system; fix: connect AND read timeouts on every external call. (2) Unbounded retries — retry storms amplify failures; fix: exponential backoff, jitter, fleet-wide retry budgets. (3) Shared thread/connection pools — one failing dependency drains everything; fix: bulkheads with dedicated pools per dependency. (4) Shallow health checks only — traffic routed to instances with broken dependencies; fix: deep health checks verifying downstream connectivity. (5) Testing only the happy path — works until the first real failure; fix: load, soak, and chaos test before major releases. (6) Coupling deploy and release — every deployment is all-or-nothing high risk; fix: feature flags, canary, blue-green. (7) Alerting on causes, not symptoms — CPU alerts fire while users suffer silently; fix: alert on user-facing SLIs (errors, latency, availability). (8) No capacity model — system falls over at 2x load; fix: model bottlenecks and load test to 3x expected peak.
<!-- vpmodule:atom:end release-it-common-mistakes -->
<!-- vpmodule:atom:begin release-it-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-core
title: Design for graceful degradation
summary: "Every system is eventually pushed past its limits; production-ready software must degrade gracefully, stay observable and keep operating through partial failures without human intervention."
capability_tags:
  - design-production-readiness
pattern_tags:
  - graceful-degradation
conditions_applies_when: A system claimed as production-ready.
conditions_does_not_apply_when: A prototype with no production claim.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The design names how partial failures are absorbed without human intervention.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L14-L17"
status: active
revision: 1
---

# Design for graceful degradation

Every system will eventually be pushed beyond its design limits, so the design question is not whether failures occur but whether the system degrades gracefully or collapses. Production-ready software must be resilient and observable and must keep operating through partial failures without human intervention; correctness alone is insufficient.
<!-- vpmodule:atom:end release-it-core -->
<!-- vpmodule:atom:begin release-it-deployment -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-deployment
title: Separate deployment from release
summary: "Deploy, verify, then route traffic; use zero-downtime deployment, feature flags, canary or blue-green, expand-contract migrations, immutable infrastructure and rollback faster than roll-forward."
capability_tags:
  - design-production-readiness
pattern_tags:
  - release-decoupling
conditions_applies_when: Planning a production deployment or schema change.
conditions_does_not_apply_when: A release with no user-facing change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Deploy and release are separate steps, rollback is faster, and migrations are backward-compatible."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L99-L122"
status: active
revision: 1
---

# Separate deployment from release

Decouple deployment, meaning putting code on servers, from release, meaning exposing it to users: deploy to production, verify, and only then route traffic; if something breaks, roll back the release rather than the deployment. Zero-downtime deployment is non-negotiable and may use rolling, blue-green, or canary strategies. Use feature flags to dark-launch code and enable it independently of deployment, with an emergency off switch; representative rollout enables 10%, monitors, and ramps. Keep database migrations backward-compatible because old and new code run simultaneously during deploys; use expand-contract steps such as add column, write both, backfill, and drop old. Treat infrastructure as immutable: never patch a running server; build a new image, deploy it, and destroy the old. Keep rollback faster than roll-forward; if rollback takes 30 minutes, avoid deploying. Blue-green deployment should gate traffic on health checks and smoke tests, and canary rollout should use automated rollback, representative 5% traffic with rollback if error rate exceeds 1%.
<!-- vpmodule:atom:end release-it-deployment -->
<!-- vpmodule:atom:begin release-it-observability -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-observability
title: Design health checks and observability
summary: "Use deep dependency health checks, structured logs, metrics and correlated traces; measure RED and USE, define SLI then SLO then SLA, alert on user symptoms and keep dashboards answerable in five seconds."
capability_tags:
  - design-production-readiness
pattern_tags:
  - observability-first
conditions_applies_when: Instrumenting a service or defining SLOs.
conditions_does_not_apply_when: A batch job with no service health surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Deep checks, correlated telemetry, SLI/SLO/SLA and symptom alerts are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L123-L146"
status: active
revision: 1
---

# Design health checks and observability

Treat observability as a first-class production design concern because a system cannot be operated if it cannot be observed. Emit high-cardinality structured events, not only pre-aggregated counters, so past incidents can answer new questions without shipping new instrumentation first. Distinguish shallow health checks, which only prove the process is alive, from deep health checks, which verify dependencies are reachable and resources are available; deep checks should report dependencies such as database, cache, queue, and disk status. Use three pillars: structured logs for what happened, metrics for how much, and distributed traces for where and how long; propagate trace context such as trace IDs in headers and correlate logs across services. Measure services with RED (Rate, Errors, Duration), including representative p50/p95/p99 latency per endpoint, and resources with USE (Utilization, Saturation, Errors). Define SLIs for user experience first, then SLOs as targets, then SLAs as contracts, in that order. Alert on symptoms users feel, such as error rate and latency, rather than causes such as CPU; prefer SLO burn-rate alerts over raw thresholds, such as error budget burning 10x versus CPU above 80%. Dashboards must answer whether the system is healthy within 5 seconds.
<!-- vpmodule:atom:end release-it-observability -->
<!-- vpmodule:atom:begin release-it-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-quick-diagnostic
title: Run the production diagnostic
summary: "Check timeouts, circuit breakers, pool isolation, zero-downtime deploy, deep health checks, correlated telemetry, load testing past peak and failure injection; apply the listed action for each no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a production system.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L187-L201"
status: active
revision: 1
---

# Run the production diagnostic

Audit any production system with eight yes/no checks and apply the paired action for each no: every outbound call must have a timeout, otherwise add connect and read timeouts everywhere; circuit breakers must protect critical dependencies, otherwise add breakers with tuned thresholds; pools must be isolated per dependency, otherwise implement bulkheads with dedicated pools; deployment must be possible without downtime, otherwise use rolling, blue-green, or canary deployment; health checks must verify dependencies, otherwise implement deep checks for database, cache, and queue; logs, metrics, and traces must be correlated, otherwise add distributed tracing with correlated IDs; the system must have been load-tested beyond expected peak, otherwise test to 2-3x peak and document the breaking point; and failure injection must be practiced, otherwise start chaos engineering with low-risk experiments.
<!-- vpmodule:atom:end release-it-quick-diagnostic -->