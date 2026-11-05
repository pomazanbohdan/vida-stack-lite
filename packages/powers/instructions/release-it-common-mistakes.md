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
