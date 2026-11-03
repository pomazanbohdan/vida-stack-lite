---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-diagnostic
title: Run the DDIA diagnostic
summary: "Check data-model choice, isolation defaults, replication strategy, hot-key handling, source-versus-derived data, timeout and retry tuning, and failover testing."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a data-intensive system.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L201-L212"
status: active
revision: 1
---

# Run the DDIA diagnostic

Use the seven diagnostic questions to check data-model choice, isolation defaults, replication strategy, hot-key handling, separation of source and derived data, timeout/retry tuning and failover testing.
