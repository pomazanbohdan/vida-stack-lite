---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-known-patterns
title: Adapt known system-design patterns
summary: "Use URL shortener, rate limiter, feed, chat, autocomplete, crawler and unique-ID patterns as starting points, adapting their stated choices."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing a system that matches a known pattern.
conditions_does_not_apply_when: A problem with no matching pattern or a pattern that would distort the requirements.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The chosen pattern is adapted to the actual requirements rather than copied wholesale.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L121-L145"
status: active
revision: 1
---

# Adapt known system-design patterns

Use the section's known design patterns as starting points and adapt them to the problem: URL shorteners, rate limiters, feeds, chat, autocomplete, crawlers and unique IDs. Examples specify choices such as redirect behavior, limiter algorithms, feed fanout, WebSockets and queue-backed delivery, crawler politeness and ID generation.
