---
instruction_id: compress-context-before-you-drop-it
title: Compress the context before you drop it
summary: Reduce a stretch of exploration to one sentence that keeps the conclusion before removing it from the context.
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: A long stretch of exploration or output is about to be removed from the context.
conditions_does_not_apply_when: The material is still needed in full.
artifact_contract_output_type: compressed-context
artifact_contract_required_data:
  - the conclusion kept
  - the detail removed
  - the breadcrumb for re-investigation
artifact_contract_verified_by: the removed material is replaced by a one-sentence conclusion that preserves the decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
status: active
revision: 1
---

# Compress the context before you drop it

Summarizing beats deleting. Before removing a long stretch of exploration, reduce it to one sentence capturing the conclusion:

```
Before: [8 messages debugging a failing import — various attempts, error logs, dead ends]
After:  "Import issue traced to a circular dependency in src/lib/db.ts —
         resolved by moving the shared type to src/types/index.ts."
```

The detail is gone; the decision is preserved. If the detail turns out to matter, the summary is a breadcrumb for re-investigation.
