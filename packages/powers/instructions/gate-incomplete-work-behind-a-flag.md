---
instruction_id: gate-incomplete-work-behind-a-flag
title: Gate incomplete work behind a flag
summary: "Merge increments of an unfinished feature behind a switch, so the incomplete work is merged but never user-visible."
capability_tags:
  - execute-plan
pattern_tags:
  - staged-exposure
conditions_applies_when: A feature is not ready for users but its increments have to be merged.
conditions_does_not_apply_when: The feature is finished and can be released as it is.
artifact_contract_output_type: feature-flag
artifact_contract_required_data:
  - the flag name
  - the condition that turns it on
  - the code guarded by it
artifact_contract_verified_by: the incomplete work is behind a switch that is off by default
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
  - operations
---

# Gate incomplete work behind a flag

If a feature isn't ready for users but you need to merge increments:

```typescript
// Feature flag for work-in-progress
const ENABLE_TASK_SHARING = process.env.FEATURE_TASK_SHARING === 'true';

if (ENABLE_TASK_SHARING) {
  // New sharing UI
}
```

This lets you merge small increments to the main branch without exposing incomplete work.

If the feature isn't complete, it shouldn't be user-visible. Add the flag now.
