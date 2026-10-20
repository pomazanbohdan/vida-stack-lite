---
instruction_id: choose-visual-or-textual-explanation
title: Choose a visual or textual explanation to fit the question
summary: "Offer a visual only when seeing answers the question better than reading, and keep requirements, scope, and tradeoffs in text."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The question may be clearer as an image or a diagram.
conditions_does_not_apply_when: "The question concerns only text, numbers, or a conceptual choice."
artifact_contract_output_type: explanation-choice
artifact_contract_required_data:
  - nature of the question
  - chosen medium
  - options or text
artifact_contract_verified_by: the owner selects or confirms the presented option
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/brainstorming/visual-companion.md
status: active
revision: 1
---

# Choose a visual or textual explanation to fit the question
Offer the visual companion whenever seeing would help more than reading.
Offer it the first time one of these moments comes up, never upfront.
The offer is its own message with nothing else in it.
If they decline, stay in text and don't offer again unless they raise it.
Per question, ask: would they understand this better by seeing it?
Mockups, layouts, diagrams, and side-by-side designs go in the browser.
Requirements, scope, tradeoffs, and conceptual choices stay in text.
A question about a UI topic isn't automatically a visual question.
Show mockups for something they'll look at: a screen, a page, a printout, a sign.
Show a layout or arrangement: of a screen, a room, a schedule.
Show a flow or a sequence of steps.
Show options that would look different from each other.
Show a structure that's easier to see than read: a diagram, a timeline, a map.
Use it for mockups to react to, side-by-side options, and throwaway prototypes they can click.
It's a tool, not a mode: accepting it doesn't send every question to the browser.
"This might be easier if I show you. Want me to open a browser tab with some mockups?"
