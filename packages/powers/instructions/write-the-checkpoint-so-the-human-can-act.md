---
instruction_id: write-the-checkpoint-so-the-human-can-act
title: Write the checkpoint so the human can act
summary: "A checkpoint names the exact target, numbers the steps, states the expected outcome, says why it exists and how to continue."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - output-formatting
conditions_applies_when: A checkpoint is written for a human to act on.
conditions_does_not_apply_when: The step is fully automated and no human reads it.
artifact_contract_output_type: checkpoint-request
artifact_contract_required_data:
  - what was built
  - the numbered verification steps
  - the expected outcomes
  - the signal that continues the work
artifact_contract_verified_by: the human can act on the checkpoint without asking a further question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Write the checkpoint so the human can act
Be specific: "Visit https://myapp.vercel.app" not "check deployment"
Number verification steps
State expected outcomes: "You should see X"
Provide context: why this checkpoint exists
Assume knowledge: "Configure the usual settings"
Skip steps: "Set up database" (too vague)
How to continue - "approved", "yes", or describe issues
