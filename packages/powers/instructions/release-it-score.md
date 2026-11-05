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
