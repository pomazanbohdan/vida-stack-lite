---
instruction_id: analyze-guidance-timeline
title: Build the per-turn timeline of guidance use
summary: "List human prompts and guidance invocations per turn, compare each request against trigger descriptions, and report missed or late matches."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: The complaint concerns guidance that did not fire or fired late.
conditions_does_not_apply_when: The artifact contains no guidance invocations.
artifact_contract_output_type: guidance-timeline
artifact_contract_required_data:
  - requests
  - invocations
  - misses
  - other tools
artifact_contract_verified_by: each request matched against guidance triggers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/diagnosing-superpowers/prompts/skill-timeline.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
  - operations
---

# Build the per-turn timeline of guidance use
Build the per-human-turn record of skill and plugin use, then look for gaps.
List the human prompts with line numbers and timestamps.
Using the skill-invocation and attribution meanings established in the case file, list every explicit invocation.
Include active-skill attributions and reads of the skill definition file.
Record the line, the skill name, and the human turn it happened in.
List every plugin, skill, agent type, MCP server, or hook used that is not part of the product under diagnosis.
Use only the evidenced tool, attribution, agent-dispatch, MCP, and hook meanings recorded in the case file.
For each human turn, compare the request text against the trigger descriptions of the installed skills.
Read the frontmatter description lines; the install root is in the case file.
Report a skill invoked, with the request that preceded it.
Report a turn whose request matches a skill's trigger description with no invocation in that turn, quoting the request.
Report a skill invoked one or more turns after the matching request (late).
Report each plugin, skill, or tool used that is not part of the product, with where.
Do not say whether a missed or late trigger was wrong. Report the match and the absence; the reader decides.
