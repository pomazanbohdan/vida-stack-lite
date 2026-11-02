---
instruction_id: warn-the-user-before-the-context-budget-runs-out
title: Warn the user before the context budget runs out
summary: "A heavy context spend is announced to the user as soon as it happens, with the option to checkpoint."
capability_tags:
  - curate-context
pattern_tags:
  - resource-bounds
conditions_applies_when: The session has consumed a large amount of context.
conditions_does_not_apply_when: The context use is small.
artifact_contract_output_type: context-warning
artifact_contract_required_data:
  - the warning
  - the checkpoint option
artifact_contract_verified_by: the warning was given to the user
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Warn the user before the context budget runs out
**Proactive pause warning**: If you have already consumed significant context (large file reads, multiple subagent results), warn the user: "Context budget is getting heavy. Consider checkpointing progress."
