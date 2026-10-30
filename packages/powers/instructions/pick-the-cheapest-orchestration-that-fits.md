---
instruction_id: pick-the-cheapest-orchestration-that-fits
title: Pick the cheapest orchestration that fits
summary: "Start from one perspective on one artifact and escalate to a saved command, a sequential run or a parallel fan-out only when the work demands it."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A piece of work could be run by one agent or split across several.
conditions_does_not_apply_when: The work is already fixed as a single sequential step.
artifact_contract_output_type: orchestration-choice
artifact_contract_required_data:
  - the shape chosen
  - the reason it fits the work
  - the baseline it is compared against
artifact_contract_verified_by: the chosen shape is the cheapest one that still satisfies the four questions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Pick the cheapest orchestration that fits
### 1. Direct invocation (no orchestration)
Single persona, single perspective, single artifact. The default and the cheapest option.
**Use when:** the work is one perspective on one artifact and you can describe it in one sentence.
**Cost:** one round trip. The baseline you should always compare orchestrated patterns against.
### 2. Single-persona slash command
A slash command that wraps one persona with the project's skills. Saves the user from re-explaining the workflow every time.
**Use when:** the same single-persona invocation happens repeatedly with the same setup.
**Cost:** same as direct invocation. The slash command is just a saved prompt.
**Anti-signal:** if the slash command's body is mostly "decide which persona to call," delete it and let the user call the persona directly.
Is the work one perspective on one artifact?
Yes → Direct invocation. Stop.
No → Will the same composition repeat?
No → Direct invocation, ad hoc. Stop.
Yes → Are sub-tasks independent?
No → Sequential slash commands run by user (Pattern 4).
Yes → Parallel fan-out with merge (Pattern 3). Validate against the checklist above. If any check fails → fall back to single-persona command (Pattern 2).
