---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-release-it-skill-md-f628fff6-c02"
title: "wondelai-skills: skills/release-it/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/release-it/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/release-it/SKILL.md\"}"
atom_ids:
  - release-it-score
  - release-it-stability-patterns
atom_count: 2
atoms: "[{\"atom_id\":\"release-it-score\",\"file_sha256\":\"107d74dc71dc897fcd6e6071c1e1aef4eb13d07fd817ef423af9d398377500b4\",\"content_sha256\":\"06d1837db65516e88939ba5617ee5031d52ef2b30aa791f927f1dcd0130346b2\",\"file_bytes\":1835,\"body_bytes\":740},{\"atom_id\":\"release-it-stability-patterns\",\"file_sha256\":\"c15520a5030501be0cd04a404751b1ce9e404f0b03a3a068fb3be3440d7d7588\",\"content_sha256\":\"b02092e0c9aba156d4f5df73d841281e710e55132528711ce0e446292715f407\",\"file_bytes\":2420,\"body_bytes\":1236}]"
carrier_sha256: 998e35220f1d915362aa9c242f1b34dd9fb57bd570c60c2812432079997a712f
carrier_bytes: 4460
revision: 1
status: active
---
<!-- vpmodule:atom:begin release-it-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-score
title: Score production readiness
summary: "Score the eight Quick Diagnostic rows one point per yes, report the score, failing rows and fixes, and use only the stated bands 7-8, 4-5 and 2 or less."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a production system.
conditions_does_not_apply_when: A code review that does not assess production readiness.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows and the fix for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score production readiness

Score a production system out of 8 by awarding 1 point for each Quick Diagnostic row answered yes: timeouts, circuit breakers, bulkheads, zero-downtime deploy, deep health checks, correlated telemetry, load-tested past peak, and failure injection. The goal is 8/8. Band 7-8 means every integration point is bounded, isolated, observable, and deploy/release are decoupled; band 4-5 means some patterns are present but at least 3 diagnostic rows fail, such as unbounded retries, shared pools, or shallow health checks; band <=2 means the system relies on the happy path with no breakers, no capacity model, and no failure testing. Always state the current score, the failing rows, and the specific fix for each.
<!-- vpmodule:atom:end release-it-score -->
<!-- vpmodule:atom:begin release-it-stability-patterns -->
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
<!-- vpmodule:atom:end release-it-stability-patterns -->