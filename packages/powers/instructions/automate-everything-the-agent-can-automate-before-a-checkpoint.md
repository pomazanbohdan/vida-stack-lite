---
instruction_id: automate-everything-the-agent-can-automate-before-a-checkpoint
title: Automate everything the agent can automate before a checkpoint
summary: A checkpoint is never used for work the agent can do itself; the checkpoint verifies what the automation produced.
capability_tags:
  - execute-plan
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A checkpoint is about to be placed in a plan.
conditions_does_not_apply_when: The step is genuinely only a human can take.
artifact_contract_output_type: checkpoint-design
artifact_contract_required_data:
  - the checkpoint
  - the work that was automated instead
artifact_contract_verified_by: no checkpoint asks for work the agent could have performed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 1
---

# Automate everything the agent can automate before a checkpoint
**DO:** Automate everything before checkpoint, be specific ("Visit https://myapp.vercel.app" not "check deployment"), number verification steps, state expected outcomes
**DON'T:** Ask human to do work Claude can automate, mix multiple verifications, place checkpoints before automation completes
**Why bad:** Vercel has a CLI. Claude should run `vercel --yes`. Never ask the user to do what Claude can automate via CLI/API
