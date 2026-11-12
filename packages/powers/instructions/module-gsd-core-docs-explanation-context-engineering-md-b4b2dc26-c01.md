---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-explanation-context-engineering-md-b4b2dc26-c01"
title: "gsd-core: docs/explanation/context-engineering.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/explanation/context-engineering.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/explanation/context-engineering.md\"}"
atom_ids:
  - give-the-executor-a-fresh-context
  - persist-every-meaningful-output-so-a-context-reset-loses-nothing
atom_count: 2
atoms: "[{\"atom_id\":\"give-the-executor-a-fresh-context\",\"file_sha256\":\"20de17963049fa8213686718ae90854fd4047235fafd430b1e19122a5e157e2e\",\"content_sha256\":\"c6ee85d44f43549ff2e5847deceacca5b5badaf35ea24fc6c0e0bb75d452369b\",\"file_bytes\":1837,\"body_bytes\":529},{\"atom_id\":\"persist-every-meaningful-output-so-a-context-reset-loses-nothing\",\"file_sha256\":\"5bc81d8082413cc926890cd71a35ea5eb9e30312ccdf2514367129e5734d3caf\",\"content_sha256\":\"695a5b526d69aab7f6543fb4167598a3fd9f0167215afaa188b0f7f6a3823151\",\"file_bytes\":1543,\"body_bytes\":336}]"
carrier_sha256: 9bbe7e38f6dffd54b8449a6b0dc654059de760b332532548f63a97f4949479be
carrier_bytes: 3689
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-the-executor-a-fresh-context -->
---
instruction_id: give-the-executor-a-fresh-context
title: Give the executor a fresh context
summary: "The executor starts from a clean, narrowly scoped context and reads only what its own task requires; an executor that carries the accumulated history of the session is a degraded executor."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: An executor is about to be dispatched for a task.
conditions_does_not_apply_when: The task is being done in the session that accumulated the history.
artifact_contract_output_type: fresh-context
artifact_contract_required_data:
  - the task the executor receives
  - the artifacts it is given
  - what it is not given
artifact_contract_verified_by: the executor ran with a fresh context and only the artifacts its task needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/the-phase-loop.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/context-engineering.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Give the executor a fresh context
- The executor's fresh context is not a convenience — it is the mechanism by which context rot is prevented. An executor that runs with 180k tokens of accumulated session history is a degraded executor. An executor that starts clean and reads only what its plan requires is an executor operating at full capacity.
- Each can be handed to a specialised subagent that starts with a clean, carefully scoped context window — and reports its result back to a thin orchestrator that stays lean.
<!-- vpmodule:atom:end give-the-executor-a-fresh-context -->
<!-- vpmodule:atom:begin persist-every-meaningful-output-so-a-context-reset-loses-nothing -->
---
instruction_id: persist-every-meaningful-output-so-a-context-reset-loses-nothing
title: Persist every meaningful output so a context reset loses nothing
summary: "Every meaningful output is written to a file, so a restart, a crash or the next agent finds the work instead of a memory of it."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - context-relay
conditions_applies_when: An output is about to be produced that a later step or a later session will need.
conditions_does_not_apply_when: The output is a throwaway intermediate that nobody else reads.
artifact_contract_output_type: durable-output
artifact_contract_required_data:
  - the output that is written
  - where it is written
  - what a later agent reads instead of a history
artifact_contract_verified_by: the output is on disk and a later agent can read it without the session history
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/context-engineering.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Persist every meaningful output so a context reset loses nothing
- Every meaningful output is written to `.planning/` as human-readable Markdown or JSON.
- Restarting your session (or the model crashing) does not lose work.
- Any subsequent agent can read prior artefacts directly, without depending on a shared conversation history.
<!-- vpmodule:atom:end persist-every-meaningful-output-so-a-context-reset-loses-nothing -->