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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/universal-anti-patterns.md
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
