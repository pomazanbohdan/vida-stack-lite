---
instruction_id: ask-the-human-once-at-the-end-not-after-every-step
title: "Ask the human once at the end, not after every step"
summary: "The human is asked once, after the automated work is complete; a checkpoint after every step is verification fatigue."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A run contains several steps a human could be asked about.
conditions_does_not_apply_when: A step must be decided before the following step can run.
artifact_contract_output_type: checkpoint-placement
artifact_contract_required_data:
  - the single place the human is asked
  - the work that was automated first
  - the placement rule that was applied
artifact_contract_verified_by: "the human is asked once, after the automation, and not between every step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/checkpoints.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/executor-examples.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Ask the human once at the end, not after every step
Automate everything, then verify at the end
One checkpoint at end verifies the complete flow
BAD: Too many checkpoints / ✅ GOOD: Single checkpoint
Mix multiple verifications in one checkpoint
After automation completes - not before the agent does the work
After UI buildout - before declaring phase complete
Before dependent work - decisions before implementation
At integration points - after configuring external services
