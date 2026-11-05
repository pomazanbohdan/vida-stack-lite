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
