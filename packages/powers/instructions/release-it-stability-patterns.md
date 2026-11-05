---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-stability-patterns
title: Apply stability patterns
summary: "Use circuit breakers, bulkheads and timeouts to cap blast radius; require connect and read timeouts, propagated deadlines, bounded retries with jitter and a fleet budget, steady-state cleanup and fast failure."
capability_tags:
  - design-production-readiness
pattern_tags:
  - stability-pattern
conditions_applies_when: Implementing resilience at an integration point.
conditions_does_not_apply_when: A local function with no external dependency.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each external call has a timeout, breaker and bounded retry, and pools are isolated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L50-L75"
status: active
revision: 1
---

# Apply stability patterns

Counter each anti-pattern with stability patterns that cap the blast radius of one failure: circuit breakers stop cascades, bulkheads isolate blast radius, and timeouts reclaim stuck resources. A tripped breaker is expected output rather than an incident; page when it stays open, not when it opens. Circuit breakers use closed, open, and half-open states, trip after threshold failures, and periodically test recovery; representative settings are opening after 5 failures in 60 seconds and half-opening after 30 seconds. Every outbound call needs both connect and read timeouts, with deadline/timeout propagation through the call chain; representative values are connect 1 second and read 5 seconds. Retry with exponential backoff plus jitter under a fleet retry budget; representative values are base 100ms, maximum 3 retries, and a 20% fleet retry budget. Fail fast by rejecting requests known to fail, and use handshaking so a server can decline work before it is sent. Design automatic steady-state cleanup for accumulated logs, sessions, and temporary files; representative values purge sessions older than 24 hours and rotate logs at 500MB. Prefer a clean restart over continuing in an unknown state.
