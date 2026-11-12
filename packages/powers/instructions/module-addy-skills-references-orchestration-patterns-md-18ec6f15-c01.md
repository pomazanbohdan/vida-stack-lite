---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-orchestration-patterns-md-18ec6f15-c01"
title: "addy-skills: references/orchestration-patterns.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:references/orchestration-patterns.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/orchestration-patterns.md\"}"
atom_ids:
  - add-a-pattern-only-after-two-real-uses
  - check-for-a-built-in-capability-before-defining-your-own
  - isolate-wide-research-in-a-digest-returning-subagent
  - issue-parallel-dispatches-in-one-turn
  - keep-orchestration-depth-at-one-level
  - keep-the-human-as-the-orchestrator
  - make-independent-investigators-challenge-each-other
  - pick-the-cheapest-orchestration-that-fits
atom_count: 8
atoms: "[{\"atom_id\":\"add-a-pattern-only-after-two-real-uses\",\"file_sha256\":\"fe35d8c2f21d95a6eeddbec4be52506c36b848af63ea046dde22d64e4dce2ba3\",\"content_sha256\":\"06acd9465a85931d6d8f2bb82609de1f0bbba8987dea0d30d154fc596d030723\",\"file_bytes\":1843,\"body_bytes\":560},{\"atom_id\":\"check-for-a-built-in-capability-before-defining-your-own\",\"file_sha256\":\"847bf76585756e7327e9fcbe2ead8cf9cd4065ebd8b0005fbe00696f44fc9e7c\",\"content_sha256\":\"3469a0f0074b5206c48f021251b01a5ce3dabfa8eee38ddadb4f5c705b7c4604\",\"file_bytes\":1672,\"body_bytes\":523},{\"atom_id\":\"isolate-wide-research-in-a-digest-returning-subagent\",\"file_sha256\":\"b03c7c1ed00770208ec8a34ca6eb2b7cbcb4e235a17e93d3e299c55346b9d63a\",\"content_sha256\":\"6b695c5585cb8b44fcb2d5171ad5d05adc16070e9660b356d750ef4b24a4e085\",\"file_bytes\":1964,\"body_bytes\":712},{\"atom_id\":\"issue-parallel-dispatches-in-one-turn\",\"file_sha256\":\"d907f10502aa3991b2536f952f9a302d527c7a33cf1cbd8d22d53aa28efb48df\",\"content_sha256\":\"2ed0edcdff94aaa7ccad8a9f99c741d7658aa51f3c1675b4be48607ab3fe69dd\",\"file_bytes\":2286,\"body_bytes\":893},{\"atom_id\":\"keep-orchestration-depth-at-one-level\",\"file_sha256\":\"d95e3feb98b901ed6a27d21969596c6f69f17c3c081443899c7f2dec6d6f2287\",\"content_sha256\":\"eeabbca925ca40f977696b0052f2d3a9adc783233f42053189f08f47a993bc5d\",\"file_bytes\":2579,\"body_bytes\":1180},{\"atom_id\":\"keep-the-human-as-the-orchestrator\",\"file_sha256\":\"e19304a9dea7def30d91840634a37c788f1936f96deaf988c00b1972ec61baf9\",\"content_sha256\":\"a6076e7a4a03b9cc1ce893cbbca8796187d7e64ace5e123d21c079f2b05f2189\",\"file_bytes\":3059,\"body_bytes\":1795},{\"atom_id\":\"make-independent-investigators-challenge-each-other\",\"file_sha256\":\"6eca3f5354977b4d22e6672147ecb92cae79a4f50c9c7bc70f792dfc5d0b12b5\",\"content_sha256\":\"c4d4a1d7349feb8b17b11f6f4ba9700304324aae8d6b0393ea0928362abdabc9\",\"file_bytes\":2280,\"body_bytes\":883},{\"atom_id\":\"pick-the-cheapest-orchestration-that-fits\",\"file_sha256\":\"79ce1226ce28f1eb51a7f05c89a3929e03ac44ed404785c7669b6588111dad2e\",\"content_sha256\":\"2986dc04993a65a0bb81f3da46049dc5f2a453edf3525aac6b2a7a47060352df\",\"file_bytes\":2414,\"body_bytes\":1254}]"
carrier_sha256: 3b58a9056a24b4d5228b56c2372210e3da0ffbc914400cda0ea5b89d6eccb347
carrier_bytes: 19252
revision: 1
status: active
---
<!-- vpmodule:atom:begin add-a-pattern-only-after-two-real-uses -->
---
instruction_id: add-a-pattern-only-after-two-real-uses
title: Add a pattern only after two real uses
summary: "A new orchestration pattern is catalogued only after it has been used twice, shown by a concrete artifact, and had its anti-pattern named."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A new pattern is proposed for a catalog of orchestration patterns.
conditions_does_not_apply_when: No new pattern is proposed.
artifact_contract_output_type: pattern-entry-review
artifact_contract_required_data:
  - the uses
  - the artifact that demonstrates the pattern
  - why the existing patterns do not work
  - the anti-pattern shadow
artifact_contract_verified_by: all four admission conditions are met before the entry is added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/orchestration-patterns.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Add a pattern only after two real uses
Add a new entry only after:
1. You've used the pattern at least twice in real work
2. You can name a concrete artifact in this repo that demonstrates it
3. You can explain why an existing pattern wouldn't have worked
4. You can describe its anti-pattern shadow (what people will mistakenly build instead)
Premature catalog entries become aspirational documentation that no one follows.
Only include patterns that appeared in 2+ spikes or were explicitly chosen by the user.
Remove entries contradicted by newer spikes.
<!-- vpmodule:atom:end add-a-pattern-only-after-two-real-uses -->
<!-- vpmodule:atom:begin check-for-a-built-in-capability-before-defining-your-own -->
---
instruction_id: check-for-a-built-in-capability-before-defining-your-own
title: Check for a built-in capability before defining your own
summary: "Before writing a custom agent, check whether the ready-made read-only or general-purpose agents already cover the role."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A new agent or subagent is about to be defined.
conditions_does_not_apply_when: No new agent is being defined.
artifact_contract_output_type: agent-reuse-check
artifact_contract_required_data:
  - the ready-made agents checked
  - the role they cover
  - why a custom agent is still needed
artifact_contract_verified_by: the existing capabilities were checked first and a custom agent is defined only for what they miss
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/orchestration-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Check for a built-in capability before defining your own
Before defining a custom subagent, check whether one of these covers the role:
- Read-only codebase search and analysis. Use this for research isolation
- Read-only research during plan mode
- Multi-step tasks needing both exploration and modification
Don't redefine these. Layer your specialist personas on top of them.
Define a custom research subagent only when the built-in doesn't fit (e.g. you need a domain-specific system prompt the model wouldn't infer).
<!-- vpmodule:atom:end check-for-a-built-in-capability-before-defining-your-own -->
<!-- vpmodule:atom:begin isolate-wide-research-in-a-digest-returning-subagent -->
---
instruction_id: isolate-wide-research-in-a-digest-returning-subagent
title: Isolate wide research in a digest-returning subagent
summary: "When a question needs a lot of material read but the answer is small, a subagent does the reading and returns only a digest."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "A question needs many files or records read, and the answer is much smaller than the input."
conditions_does_not_apply_when: The material is small enough to read directly.
artifact_contract_output_type: research-digest
artifact_contract_required_data:
  - the question
  - the material read
  - the digest returned
artifact_contract_verified_by: the main context receives the digest and not the raw material
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/orchestration-patterns.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Isolate wide research in a digest-returning subagent
When a task requires reading large amounts of material that shouldn't pollute the main context, spawn a research sub-agent that returns only a digest.
**Use when:**
- The main session needs to stay focused on a downstream task
- The investigation result is much smaller than the input it consumes
- The decision quality benefits from the main agent having room to think after
**Cost:** one isolated sub-agent context. Worth it any time the alternative is loading hundreds of files into the main context.
Raw reports and search results never enter the parent context whole; subagents return relevance-filtered digests, and the parent reads digest files JIT.
<!-- vpmodule:atom:end isolate-wide-research-in-a-digest-returning-subagent -->
<!-- vpmodule:atom:begin issue-parallel-dispatches-in-one-turn -->
---
instruction_id: issue-parallel-dispatches-in-one-turn
title: Issue parallel dispatches in one turn
summary: "Parallel work is dispatched together in a single turn, because one dispatch per turn serialises the work; a dispatched subagent is awaited in that same turn and is never left running in the background."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several agents are to run at the same time.
conditions_does_not_apply_when: The agents run one after another by design.
artifact_contract_output_type: dispatch-shape-check
artifact_contract_required_data:
  - the dispatches
  - the turn they are issued in
artifact_contract_verified_by: all the parallel dispatches are issued in the same turn
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/orchestration-patterns.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Issue parallel dispatches in one turn
Parallel fan-out requires issuing multiple agent dispatches in a single assistant turn. Sequential turns serialize execution.
Any new orchestrator command should do the same.

Launch all the subagents a step calls for in one message — several blocking calls awaited together in the same turn — then wait for all their results before continuing.
Never split a step's launches across messages, and never run one detached.
Never run a subagent in the background / detached / async.
Never end your turn to "await a completion notification."
This workflow runs unattended: there is no event loop to resume a yielded turn, so a backgrounded subagent never hands control back and the run stalls.
Never end your turn to "await a completion notification."
issue every runnable entry's agent call together, in this one message, before waiting on any of them.
<!-- vpmodule:atom:end issue-parallel-dispatches-in-one-turn -->
<!-- vpmodule:atom:begin keep-orchestration-depth-at-one-level -->
---
instruction_id: keep-orchestration-depth-at-one-level
title: Keep the orchestration depth at one level
summary: An agent does not call another agent and an orchestrator does not call an orchestrator; the merge happens in the main context.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A workflow is designed in which one agent or coordinator calls another.
conditions_does_not_apply_when: The workflow has a single level of agents.
artifact_contract_output_type: orchestration-depth-review
artifact_contract_required_data:
  - the depth of the proposed workflow
  - the level that performs the merge
artifact_contract_verified_by: the orchestration depth is at most one level and the merge happens in the main agent
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/orchestration-patterns.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the orchestration depth at one level
### B. Persona that calls another persona
**Why it fails:**
- Personas were designed to produce a single perspective; chaining them defeats that
- The summary the calling persona passes loses context the called persona needs
- Failure modes multiply (which persona's output format wins? whose rules apply?)
- Hides cost from the user
**What to do instead:** have the calling persona *recommend* a follow-up audit in its report. The user or a slash command runs the second pass.
### D. Deep persona trees
**Why it fails:**
- Each layer adds latency and tokens with no decision value
- Debugging becomes a multi-level investigation
- The leaf personas lose context to multiple summarization steps
**What to do instead:** keep the orchestration depth at most 1 (slash command → personas). The merge happens in the main agent.
This keeps the auto-advance chain flat — each phase runs at the same nesting level rather than spawning deeper Task agents.
Run plan-phase inline (do NOT wrap it in a nested agent) — the orchestrator runs at the top level, where the planning step can still spawn the planner and the checker one level down.
<!-- vpmodule:atom:end keep-orchestration-depth-at-one-level -->
<!-- vpmodule:atom:begin keep-the-human-as-the-orchestrator -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/orchestration-patterns.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/build/autonomous-development-loops.md
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
<!-- vpmodule:atom:end keep-the-human-as-the-orchestrator -->
<!-- vpmodule:atom:begin make-independent-investigators-challenge-each-other -->
---
instruction_id: make-independent-investigators-challenge-each-other
title: Make independent investigators challenge each other
summary: "When several causes fit the same symptoms, the investigators have to be able to contradict each other, and the group converges only on a cause two of them agree they can disprove."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: Several causes fit the same symptoms and the wrong cause is expensive.
conditions_does_not_apply_when: "One cause is already established, or the artifact is known and a verdict is what is wanted."
artifact_contract_output_type: converged-root-cause
artifact_contract_required_data:
  - the hypotheses
  - the counter-evidence each investigator produced
  - the hypothesis that survived
artifact_contract_verified_by: two investigators independently ruled out the hypotheses that were discarded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/orchestration-patterns.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/customize/run-multi-agent-discussions.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Make independent investigators challenge each other
A single agent will pick the first plausible theory and stop investigating.
A subagent fan-out would have each persona report independently — but their reports never meet, so nothing rules out the wrong theories.
With multiple independent investigators actively trying to disprove each other, the theory that survives is much more likely to be the actual root cause.
Update findings as consensus emerges. Only converge when two teammates agree they can disprove the others'.
The lead synthesizes the converged finding and presents it to you.
Reach for agent teams only when teammates **need** to challenge each other to produce the right answer.
One model voicing five personas tends to make them agree.
Separate agents keep their reasoning independent, which is the point of a review panel or a focus group, at a higher cost.
<!-- vpmodule:atom:end make-independent-investigators-challenge-each-other -->
<!-- vpmodule:atom:begin pick-the-cheapest-orchestration-that-fits -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/orchestration-patterns.md
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
<!-- vpmodule:atom:end pick-the-cheapest-orchestration-that-fits -->