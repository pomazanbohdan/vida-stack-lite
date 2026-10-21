---
instruction_id: pass-the-file-path-to-the-sub-agent-not-the-file-contents
title: "Pass the file path to the sub-agent, not the file contents"
summary: A delegated agent receives the path of what it must read; the contents are not inlined into the prompt.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - context-relay
conditions_applies_when: Work is handed to another agent.
conditions_does_not_apply_when: The content is a short value that has to be passed as data.
artifact_contract_output_type: delegation-prompt
artifact_contract_required_data:
  - the path of the file to read
artifact_contract_verified_by: the prompt carries a path and no file body
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debug-session-manager.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debug-session-manager.compact.md
status: active
revision: 1
---

# Pass the file path to the sub-agent, not the file contents
Pass file paths to spawned agents — never inline file contents.
Do not load the full codebase into your context.
Read only the debug file and project metadata.
