---
instruction_id: prototype-to-answer-a-question
title: Prototype to answer a question
summary: "Build throwaway code that answers one design question, marked as throwaway, trivial to run, with no persistence and no polish."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A design question is hard to settle on paper.
conditions_does_not_apply_when: The question can be answered by reading or reasoning.
artifact_contract_output_type: throwaway-prototype
artifact_contract_required_data:
  - question
  - prototype
  - answer
artifact_contract_verified_by: the prototype is trivially runnable and the question is answered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/prototype/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Prototype to answer a question
A prototype is **throwaway code that answers a question**. The question decides the shape.
Identify which question is being answered, using the user's prompt, the surrounding code, or by asking if the user is around:
- **"Does this logic / state model feel right?"** → build a single shareable HTML file (free-play buttons plus tabbed guided walkthroughs) that pushes the state machine through cases that are hard to reason about on paper, and that a non-developer can drive.
- **"What should this look like?"** → generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.
The two branches produce very different artifacts, so getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.
## Rules that apply to both
1. **Throwaway from day one, and clearly marked as such.** Locate the prototype code close to where it will actually be used (next to the module or page it's prototyping for) so context is obvious, but name it so a casual reader can see it's a prototype, not production. For throwaway UI routes, obey whatever routing convention the project already uses; don't invent a new top-level structure.
2. **Trivial to run.** A UI prototype starts from one command in the project's task runner. A logic demo is a single HTML file the user double-clicks. Either way, no thinking required to start it.
3. **No persistence by default.** State lives in memory. Persistence is the thing the prototype is _checking_, not something it should depend on. If the question explicitly involves a database, hit a scratch DB or a local file with a clear "PROTOTYPE, wipe me" name.
4. **Skip the polish.** No tests, no error handling beyond what makes the prototype _runnable_, no abstractions. The point is to learn something fast.
5. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state so the user can see what changed.
