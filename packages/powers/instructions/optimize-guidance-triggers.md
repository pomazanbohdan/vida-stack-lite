---
instruction_id: optimize-guidance-triggers
title: Describe triggering conditions in the guidance
summary: "Write the description for discovery: concrete symptoms and contexts in third person, with no summary of the workflow."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The guidance must be found for the task it addresses.
conditions_does_not_apply_when: The guidance is always loaded together with the task.
artifact_contract_output_type: guidance-trigger
artifact_contract_required_data:
  - applies-when condition
  - symptoms
  - keywords
  - boundary
artifact_contract_verified_by: the guidance is found from a symptom-only request
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
status: active
revision: 1
---

# Describe triggering conditions in the guidance
The description should only describe triggering conditions.
Do not summarize the skill's process or workflow in the description.
When a description summarizes the workflow, an agent may follow the description instead of reading the full content.
Start with "Use when..." to focus on triggering conditions.
Include specific symptoms, situations, and contexts.
Use concrete triggers that signal this guidance applies.
Describe the problem, not language-specific symptoms.
Keep triggers technology-agnostic unless the guidance itself is technology-specific.
If the guidance is technology-specific, make that explicit in the trigger.
Write in third person.
Use words an agent would search for.
Include error messages, symptoms, synonyms, and tool names.
Keep the description under 500 characters if possible.
Agents use the description to choose the right guidance from potentially 100+ available items.
The description must provide enough detail for an agent to know when to select this guidance.
