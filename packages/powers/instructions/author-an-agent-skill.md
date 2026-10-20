---
instruction_id: author-an-agent-skill
title: Author an agent skill
summary: "You own the skill's voice: keep only prose that changes a decision, validate the structure, and leave choices that belong to the user open."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: You create or rewrite an instruction an agent loads for repeated work.
conditions_does_not_apply_when: "A one-off hint in a conversation is enough, not a reusable skill."
artifact_contract_output_type: agent-skill
artifact_contract_required_data:
  - situation
  - result
  - steps
  - bounds
  - examples
artifact_contract_verified_by: the skill run on one task it should help and one it should ignore
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/authoring-a-skill.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/sharpen/SKILL.md
status: active
revision: 1
---

# Author an agent skill
You own the skill's voice.
Use the environment's skill-authoring facility when one exists.
Validate the skill: the frontmatter has a name and a description, referenced files exist, and cross-skill links resolve.
Write test cases when the change is structural. Skip them when the judgment is subjective.
Before starting, ask how a top expert would approach this task: their raw sources, their real methods, and an outside check that the result is right.
Ask what the user is really after, and whether the task is over- or underspecified.
Loosen constraints that do not serve the goal as readily as you add ones that do, and leave choices that are the user's to make open instead of deciding them.
When in doubt, delete. Keep only prose that changes a decision.
Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one.
Match tone to scope.
Point at structural sources such as types, READMEs, and configuration instead of restating them in prose.
Delegate to other skills by path. Do not restate them.
A workflow you keep hitting but is not captured is a reason to propose a new skill.
Fold in only what makes the work better, not bigger, but always keep one outside check that the result is right.
Do not narrate the framing and do not hand back a rewritten prompt.
Reply with a summary of the skill, the key design decisions, and the validation notes.
