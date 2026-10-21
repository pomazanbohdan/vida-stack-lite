---
instruction_id: optimize-guidance-triggers
title: Describe triggering conditions in the guidance
summary: "Write the description for discovery: concrete symptoms and contexts in third person, with no summary of the workflow."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - description-shape-policy
conditions_applies_when: The guidance must be found for the task it addresses.
conditions_does_not_apply_when: The guidance is always loaded together with the task.
artifact_contract_output_type: guidance-trigger
artifact_contract_required_data:
  - applies-when condition
  - symptoms
  - keywords
  - boundary
artifact_contract_verified_by: the guidance is found from a symptom-only request
compatibility_excludes:
  - write-the-description-as-a-summary-and-trigger-phrases
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/productivity/writing-for-agents/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-description.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-trigger.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/existing-codebases/theory-of-project-context.md
status: active
revision: 4
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
A **context pointer** is a reference held in the agent's context that names some out-of-context material and encodes the condition for reaching it. A skill's description is one; a line naming a doc is the same object. The pointer's _wording_, not its target, decides when the agent reaches the material, and how reliably. A must-have target behind a weakly worded pointer is a variance bug: sharpen the wording first, and inline the material only if sharpening fails. A pointer does two jobs: state what the material is, and list the **branches** that should trigger reaching it (a branch is a distinct case the document handles, so different runs take different paths through it). Every word of an always-loaded pointer costs on every turn, so it earns even harder pruning than the body: front-load the leading word, use one trigger per branch, cut identity the body already carries.
Name the user's problem rather than a tool's symptom, unless the skill is about that tool.
Add `Not for ...`, naming the sibling skill, only when a trigger eval or a known sibling shows the skill taking its neighbour's requests.
All "when to use" lives here, none in the body, which is read only after the choice. A description that explains the procedure lets the model skip the body and improvise.
An agent's `Use when` opens with the user asking to talk to it by name, then carries the phrases and concepts of every capability that lives inside it, because the agent's description is the only trigger those capabilities have; a menu item that invokes an installed skill needs none, since that skill triggers itself.
Nothing on what it does before the `Use when`, or first person ("I help you"): Minor.
Procedure in the description: steps or flow the body should own. Minor; the model can skip the body and improvise.
"When to use" text in the body: an overview saying when the skill applies, trigger phrases under a heading. Minor; the model never sees it when choosing.
Pointers out of it must name a trigger the agent can observe — a path, a file type, a concrete task — never one it must judge.
In a test over a 709-page wiki, agents skipped the index and guessed page paths from the question instead.
