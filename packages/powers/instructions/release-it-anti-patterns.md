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
