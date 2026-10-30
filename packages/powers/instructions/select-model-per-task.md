---
instruction_id: select-model-per-task
title: Choose the worker by task complexity
summary: "Use the least powerful model that can handle each role, and name it explicitly so an omitted default does not defeat the choice."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A task or a review is about to be dispatched to a worker.
conditions_does_not_apply_when: The same worker does the work without a choice of level.
artifact_contract_output_type: worker-selection
artifact_contract_required_data:
  - task complexity
  - chosen level
  - reason
artifact_contract_verified_by: worker capability matches recorded task complexity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Choose the worker by task complexity
Use the least powerful model that can handle each role to conserve cost and increase speed.
Mechanical implementation tasks (isolated functions, clear specs, 1-2 files): use a fast, cheap model.
Most implementation tasks are mechanical when the plan is well-specified.
Integration and judgment tasks (multi-file coordination, pattern matching, debugging): use a standard model.
Architecture and design tasks: use the most capable available model.
The final whole-branch review is one of these — dispatch it on the most capable available model, not the session default.
Review tasks: choose the model with the same judgment, scaled to the diff's size, complexity, and risk.
A small mechanical diff does not need the most capable model; a subtle concurrency change does.
Scoped re-reviews of small fix diffs take a cheap-to-mid tier.
Fix-loop escalation (rounds 4-5): use a model at least one tier above the implementer that got stuck.
Always specify the model explicitly when dispatching a subagent.
An omitted model inherits your session's model — often the most capable and most expensive — which silently defeats this section.
Turn count beats token price.
Wall-clock and context cost scale with how many turns a subagent takes, and the cheapest models routinely take 2-3× the turns on multi-step work — costing more overall.
Use a mid-tier model as the floor for reviewers and for implementers working from prose descriptions.
When the task's plan text contains the complete code to write, the implementation is transcription plus testing: use the cheapest tier for that implementer.
Keep the lead on the strongest model; researchers at most one tier down; judgment work never on the smallest tier.
- The model profile system, resolved per agent, lets you assign cheaper tiers to less critical agents.
