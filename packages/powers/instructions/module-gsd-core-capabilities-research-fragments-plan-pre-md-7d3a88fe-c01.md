---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-capabilities-research-fragments-plan-pre-md-7d3a88fe-c01"
title: "gsd-core: capabilities/research/fragments/plan-pre.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:capabilities/research/fragments/plan-pre.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"capabilities/research/fragments/plan-pre.md\"}"
atom_ids:
  - answer-the-planning-question-not-the-implementation-question
  - consult-guidance-before-acting
atom_count: 2
atoms: "[{\"atom_id\":\"answer-the-planning-question-not-the-implementation-question\",\"file_sha256\":\"e3067011c0a2945e0234570e18167ac3ae4c91e79f83ff44623240a10185afb6\",\"content_sha256\":\"147902ba90a04900eca91634c0e9c8441942b1c46d86c1da3a3e9b506e820a41\",\"file_bytes\":1438,\"body_bytes\":187},{\"atom_id\":\"consult-guidance-before-acting\",\"file_sha256\":\"7c9f21898125b2efecdcc5b576ec407ea426bcb93c989fd12fe7a2a0bb9ef41c\",\"content_sha256\":\"6ed2a17943e0c4a87c5ab324a175d59fb7e4b641ac7f82d052b98778d5a042c4\",\"file_bytes\":2880,\"body_bytes\":1699}]"
carrier_sha256: 5e099eb132ccd4197ec5ab4809034ebb11d3c6c8adc71b42a2d4c8ce2ed807b6
carrier_bytes: 4613
revision: 1
status: active
---
<!-- vpmodule:atom:begin answer-the-planning-question-not-the-implementation-question -->
---
instruction_id: answer-the-planning-question-not-the-implementation-question
title: "Answer the planning question, not the implementation question"
summary: "The research a planning step commissions is scoped by the question the plan has to answer, not by the question the implementation will have to answer."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A planning step commissions research before the plan exists.
conditions_does_not_apply_when: The question the plan must answer has already been settled and recorded.
artifact_contract_output_type: research-brief
artifact_contract_required_data:
  - the phase the research serves
  - the question the plan must answer
  - the requirement ids the research must address
artifact_contract_verified_by: the research answers the planning question and names the requirement ids it covers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/research/fragments/plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Answer the planning question, not the implementation question
- Research how to implement Phase {phase_number}: {phase_name}
- Answer: "What do I need to know to PLAN this phase well?"
<!-- vpmodule:atom:end answer-the-planning-question-not-the-implementation-question -->
<!-- vpmodule:atom:begin consult-guidance-before-acting -->
---
instruction_id: consult-guidance-before-acting
title: Check for applicable guidance before acting
summary: "Invoke the relevant guidance before any response, including clarifying questions, and follow it exactly once chosen."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A new task or change starts and guidance may govern that kind of work.
conditions_does_not_apply_when: The owner explicitly exempted this action from the guidance.
artifact_contract_output_type: guidance-check
artifact_contract_required_data:
  - task
  - applicable guidance
  - order of application
artifact_contract_verified_by: applicable guidance identified before the action
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/using-superpowers/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/research/fragments/plan-pre.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check for applicable guidance before acting
Invoke relevant or requested skills BEFORE any response or action — including clarifying questions, exploring the codebase, or checking files.
If it turns out wrong for the situation, you don't have to use it.
Before entering plan mode: if you haven't already brainstormed, invoke the brainstorming skill first.
Then announce "Using [skill] to [purpose]" and follow the skill exactly.
If it has a checklist, create a todo per item.
When multiple skills apply, process skills come first — they set the approach, then implementation skills carry it out.
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.
If a skill applies to your task, you do not have a choice. You must use it.
"I remember this skill" is a red flag: skills evolve, so read the current version.
"This is just a simple question" is a red flag: questions are tasks, so check for skills.
"I need more context first" is a red flag: the skill check comes before clarifying questions.
"Let me explore the codebase first" is a red flag: skills tell you how to explore, so check first.
"The skill is overkill" is a red flag: simple things become complex, so use it.
User instructions take precedence over skills, which in turn override default behavior.
Only skip skill workflows or instructions when your human partner has explicitly told you to.
- **Project instructions:** Read ./CLAUDE.md or ./.claude/CLAUDE.md if either exists; follow project-specific guidelines.
- **Project skills:** Check .claude/skills/ or .agents/skills/ directory if either exists. Read SKILL.md files and account for project skill patterns.
<!-- vpmodule:atom:end consult-guidance-before-acting -->