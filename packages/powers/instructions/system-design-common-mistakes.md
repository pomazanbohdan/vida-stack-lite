---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-common-mistakes
title: Avoid common system-design mistakes
summary: "Avoid designing before requirements, omitted estimates, single points of failure, premature sharding, cache without invalidation, synchronous calls everywhere, ignored hotspots and absent monitoring."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a system design for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the corrective practice.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L170-L182"
status: active
revision: 1
---

# Avoid common system-design mistakes

Avoid designing before requirements, omitting estimation, single points of failure, premature sharding, caching without invalidation, synchronous calls on every path, ignored hotspots, and absent monitoring; apply the corrective practice listed for each mistake.
