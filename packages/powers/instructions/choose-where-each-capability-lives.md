---
instruction_id: choose-where-each-capability-lives
title: Choose where each capability lives
summary: "Every capability sits in exactly one place: an installed skill, a one-sentence prompt in the menu, or a capability file written to the canon — never a copy of another skill's content."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An agent offers several things the user can ask it to do.
conditions_does_not_apply_when: The agent offers one thing and it needs no menu.
artifact_contract_output_type: capability-placement
artifact_contract_required_data:
  - each capability
  - its place
  - why
artifact_contract_verified_by: "every capability sits in exactly one place and no capability file repeats a skill's text"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/agent/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/assets/CAPABILITIES-template.md
status: active
revision: 1
---

# Choose where each capability lives
A menu item is exactly one of `skill = "<installed skill>"` or `prompt = "..."`.
An installed skill when one does the job; ship records it.
Inline when the persona plus a sentence of intent is all it takes.
The user lists it so the menu shows what is on offer, not because the model needs teaching; a capability file for it would be padding.
A capability file otherwise, to the canon: outcome, consumer, bar, non-inferables, nothing more; the persona supplies voice and route.
Never copy another skill's content in; name it.
Tell me "I want you to be able to do X" and we'll create it together.
I'll write the prompt to the standard my built-in ones meet (the outcome, who acts on it, the bar, what I could not infer)
Next session, I'll know how.
