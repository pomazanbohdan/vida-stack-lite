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
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/using-superpowers/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/research/fragments/plan-pre.md
status: active
revision: 2
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
