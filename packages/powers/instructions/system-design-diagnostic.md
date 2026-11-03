---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: system-design-diagnostic
title: Run the system-design diagnostic
summary: "Check requirements, QPS and storage estimates, redundancy, database scaling, caching, queues, monitoring and deployment."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a system design.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/system-design/SKILL.md; sha256=57548bbec281e73fed47ed8f2e16394ece68129342d04047f44c8c5b9ef64c38; locator=skills/system-design/SKILL.md#L183-L195"
status: active
revision: 1
---

# Run the system-design diagnostic

Use the diagnostic questions to check requirements, QPS/storage estimates, redundancy, database scaling, caching, queues, monitoring and deployment; apply the matching action when a question's answer is no.
