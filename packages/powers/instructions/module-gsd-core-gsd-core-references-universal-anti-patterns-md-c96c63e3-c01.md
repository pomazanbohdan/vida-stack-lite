---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-universal-anti-patterns-md-c96c63e3-c01"
title: "gsd-core: gsd-core/references/universal-anti-patterns.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/references/universal-anti-patterns.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/universal-anti-patterns.md\"}"
atom_ids:
  - do-not-re-litigate-a-locked-decision
  - never-read-the-definition-of-an-agent-you-are-about-to-spawn
  - one-primary-next-action-with-the-alternatives-secondary
  - warn-the-user-before-the-context-budget-runs-out
  - write-shared-state-through-its-owner-not-by-hand
atom_count: 5
atoms: "[{\"atom_id\":\"do-not-re-litigate-a-locked-decision\",\"file_sha256\":\"cc2ab48c0c94065673494f337b1f01519d2380639d91ac527cd89deb9bd603b6\",\"content_sha256\":\"b69838e71a0a00371ffaadfb9a675468cd8589b9af7352d6ce652e689c605937\",\"file_bytes\":1055,\"body_bytes\":136},{\"atom_id\":\"never-read-the-definition-of-an-agent-you-are-about-to-spawn\",\"file_sha256\":\"09e2eb368f2a5e19c50b66c617aa622181d54d817394399b758309f4f8a8678f\",\"content_sha256\":\"1bce444b432d5e7380cbd2a4cf41ec55c73009aab2ddf0fb0aa9da0caef8e9c1\",\"file_bytes\":1675,\"body_bytes\":537},{\"atom_id\":\"one-primary-next-action-with-the-alternatives-secondary\",\"file_sha256\":\"5bba86f204cff96703a61baf8302e62b70a4c7c519dc91e6f424b70dd7fc7064\",\"content_sha256\":\"abe1a3bfac50d5079448c32c015e03f5f7e9277ade80bd6e3aa5ce0a5635d985\",\"file_bytes\":1393,\"body_bytes\":377},{\"atom_id\":\"warn-the-user-before-the-context-budget-runs-out\",\"file_sha256\":\"b5345d34f6a17e06f09a030ab80dfd12f1fbdcca3e0baa93fe06b6fe520de7bf\",\"content_sha256\":\"1991d7322f4fd1b90c59ffdc78bceb0f835081d5f2d74e768e6e4959fafefad3\",\"file_bytes\":1239,\"body_bytes\":259},{\"atom_id\":\"write-shared-state-through-its-owner-not-by-hand\",\"file_sha256\":\"641f9e0addd60d6599e2c18e94ae4fbd49fc837a93706d560b2bb75b4a435745\",\"content_sha256\":\"7018e75da678dfe66696139add3e986d8b4434f8e225b8719312f9b1d19cf7fd\",\"file_bytes\":1237,\"body_bytes\":183}]"
carrier_sha256: 8235f85f0c3a4cf8cd88fb25b07e3c4d13cf897ac855c042ba44038eb2554254
carrier_bytes: 7382
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-re-litigate-a-locked-decision -->
---
instruction_id: do-not-re-litigate-a-locked-decision
title: Do not re-litigate a locked decision
summary: A decision that was already locked is respected unconditionally.
capability_tags:
  - execute-plan
pattern_tags:
  - frozen-intent
conditions_applies_when: A locked decision is met while the work is being done.
conditions_does_not_apply_when: The decision is not locked.
artifact_contract_output_type: locked-decision
artifact_contract_required_data:
  - the locked decision
artifact_contract_verified_by: the locked decision was honoured without being reopened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Do not re-litigate a locked decision
Do not re-litigate decisions that are already locked in
respect locked decisions unconditionally
<!-- vpmodule:atom:end do-not-re-litigate-a-locked-decision -->
<!-- vpmodule:atom:begin never-read-the-definition-of-an-agent-you-are-about-to-spawn -->
---
instruction_id: never-read-the-definition-of-an-agent-you-are-about-to-spawn
title: Never read the definition of an agent you are about to spawn
summary: "The agent definition is loaded automatically; large files are pointed at, not inlined."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: A subagent is about to be spawned or a large file has to reach it.
conditions_does_not_apply_when: The file has to be inspected in this session to answer the question.
artifact_contract_output_type: context-handoff
artifact_contract_required_data:
  - the agent definition
  - the files it was pointed at instead of inlined
artifact_contract_verified_by: no agent definition was read into the orchestrator and no large file was inlined
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never read the definition of an agent you are about to spawn
**Never** read agent definition files (`agents/*.md`) -- `subagent_type` auto-loads them. Reading agent definitions into the orchestrator wastes context for content automatically injected into subagent sessions
**Never** inline large files into subagent prompts -- tell agents to read files from disk instead. Agents have their own context windows
**Delegate** heavy work to subagents -- the orchestrator routes, it does not build, analyze, research, investigate, or verify
<!-- vpmodule:atom:end never-read-the-definition-of-an-agent-you-are-about-to-spawn -->
<!-- vpmodule:atom:begin one-primary-next-action-with-the-alternatives-secondary -->
---
instruction_id: one-primary-next-action-with-the-alternatives-secondary
title: "One primary next action, with the alternatives secondary"
summary: One next action is proposed as the primary and the alternatives are listed behind it.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - concise-communication
conditions_applies_when: The next steps are presented to the user.
conditions_does_not_apply_when: Only one step exists.
artifact_contract_output_type: next-action-list
artifact_contract_required_data:
  - the primary next action
  - the secondary alternatives
artifact_contract_verified_by: exactly one action is marked primary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - operations
---

# One primary next action, with the alternatives secondary
Do not suggest multiple next actions without clear priority -- one primary suggestion, alternatives listed secondary
Do not create artifacts the user did not approve -- always confirm before writing new planning documents
Do not modify files outside the workflow's stated scope -- check the plan's files_modified list
<!-- vpmodule:atom:end one-primary-next-action-with-the-alternatives-secondary -->
<!-- vpmodule:atom:begin warn-the-user-before-the-context-budget-runs-out -->
---
instruction_id: warn-the-user-before-the-context-budget-runs-out
title: Warn the user before the context budget runs out
summary: "A heavy context spend is announced to the user as soon as it happens, with the option to checkpoint."
capability_tags:
  - curate-context
pattern_tags:
  - resource-bounds
conditions_applies_when: The session has consumed a large amount of context.
conditions_does_not_apply_when: The context use is small.
artifact_contract_output_type: context-warning
artifact_contract_required_data:
  - the warning
  - the checkpoint option
artifact_contract_verified_by: the warning was given to the user
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Warn the user before the context budget runs out
**Proactive pause warning**: If you have already consumed significant context (large file reads, multiple subagent results), warn the user: "Context budget is getting heavy. Consider checkpointing progress."
<!-- vpmodule:atom:end warn-the-user-before-the-context-budget-runs-out -->
<!-- vpmodule:atom:begin write-shared-state-through-its-owner-not-by-hand -->
---
instruction_id: write-shared-state-through-its-owner-not-by-hand
title: "Write shared state through its owner, not by hand"
summary: The shared state and roadmap are changed through their registered handlers; a direct write bypasses the safe update logic.
capability_tags:
  - harden-validation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A shared state or roadmap file has to be changed.
conditions_does_not_apply_when: The file is being created for the first time from its template.
artifact_contract_output_type: state-update
artifact_contract_required_data:
  - the handler that owns the change
artifact_contract_verified_by: the change went through the registered handler
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Write shared state through its owner, not by hand
No direct write to the shared state
Direct Write tool usage bypasses safe update logic and is unsafe in multi-session environments
<!-- vpmodule:atom:end write-shared-state-through-its-owner-not-by-hand -->