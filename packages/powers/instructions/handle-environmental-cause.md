---
instruction_id: handle-environmental-cause
title: Tell an environmental cause from an incomplete investigation
summary: "Only after a complete investigation may a failure be environmental; document what was investigated, add handling, and monitor it."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: "The investigation points to the environment, timing, or an external system."
conditions_does_not_apply_when: The cause is already established in code and confirmed by reproduction.
artifact_contract_output_type: environmental-cause-report
artifact_contract_required_data:
  - checked environment
  - evidence boundary
  - handling
  - observation
artifact_contract_verified_by: the documented investigation and the added handling are both present
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Tell an environmental cause from an incomplete investigation
If systematic investigation reveals issue is truly environmental, timing-dependent, or external:
You've completed the process.
Document what you investigated.
Implement appropriate handling (retry, timeout, error message).
Add monitoring/logging for future investigation.
95% of "no root cause" cases are incomplete investigation.
Under time pressure (emergencies make guessing tempting).
"Just one quick fix" seems obvious.
You've already tried multiple fixes.
Previous fix didn't work.
You don't fully understand the issue.
Simple bugs have root causes too.
Rushing guarantees rework.
Systematic is faster than thrashing.
