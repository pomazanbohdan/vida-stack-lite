---
instruction_id: keep-the-human-as-the-orchestrator
title: Keep the human as the orchestrator
summary: "The human, or a saved command they invoke, orchestrates the work; an agent whose only job is to decide which other agent to call is removed."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A command or an agent is proposed that only routes work to other agents.
conditions_does_not_apply_when: No routing layer is being proposed.
artifact_contract_output_type: orchestration-owner-review
artifact_contract_required_data:
  - who orchestrates
  - the value the routing layer adds
  - what replaces it
artifact_contract_verified_by: the orchestration stays with the human and no layer exists only to pick another agent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the human as the orchestrator
The governing rule: **the user (or a slash command) is the orchestrator. Personas do not invoke other personas.**
### A. Router persona ("meta-orchestrator")
A persona whose job is to decide which other persona to call.
**Why it fails:**
- Pure routing layer with no domain value
- Adds two paraphrasing hops → information loss + roughly 2× token cost
- The user already knew they wanted a review; they could have called the review command directly
- Replicates the work that slash commands and intent mapping in the project instructions already do
**What to do instead:** add or refine slash commands. Document intent → command mapping in the project instructions.
### C. Sequential orchestrator that paraphrases
**Why it fails:**
- Loses the human checkpoints that catch wrong-direction work
- Each hand-off summarizes context — accumulated drift over a long pipeline
- Doubles token cost: orchestrator turn + sub-agent turn for every step
- Removes user agency at exactly the points where judgment matters most
**What to do instead:** keep the user as the orchestrator. Document the recommended sequence in the project documentation and let users invoke it.
**Why not automate it:** an LLM "lifecycle orchestrator" would (a) lose nuance between steps because it has to summarize for hand-off, (b) skip the human checkpoints that catch wrong-direction work early, and (c) double the token cost via paraphrasing turns.
The worker builds only what its invocation names; it never picks the next ticket itself.
It owns only its implementation run and the plan it creates or resumes.
A human or an orchestrator owns backlog policy and dispatch.
The orchestrating session remains responsible for keeping those revisions consistent with the larger intent.
