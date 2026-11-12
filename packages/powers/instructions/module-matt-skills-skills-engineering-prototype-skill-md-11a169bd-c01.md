---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-prototype-skill-md-11a169bd-c01"
title: "matt-skills: skills/engineering/prototype/SKILL.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/prototype/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/prototype/SKILL.md\"}"
atom_ids:
  - capture-the-prototype-as-primary-source
  - prototype-to-answer-a-question
atom_count: 2
atoms: "[{\"atom_id\":\"capture-the-prototype-as-primary-source\",\"file_sha256\":\"4648550953e3b325c1b08fe5e832ab2088b80e1e6e53eb600c15955eeda6e018\",\"content_sha256\":\"8dcaa21d74cda0cc44f9d3b0918b4818e05b91fc2d42391545bc962617377946\",\"file_bytes\":1947,\"body_bytes\":823},{\"atom_id\":\"prototype-to-answer-a-question\",\"file_sha256\":\"63ad19bed0fcf58192b74e24908d8b24b1183b880000eb0c91e7b29d73eec9ba\",\"content_sha256\":\"97f3676b989b48753fa7e6ce9f3e40f4ca58e4f1d43c47027834deb8685b7ec0\",\"file_bytes\":3263,\"body_bytes\":2225}]"
carrier_sha256: 964b88c398b1c61ee9f27099d0fa8910d78bb159b2e47898d6e76ea50f3260a3
carrier_bytes: 5463
revision: 1
status: active
---
<!-- vpmodule:atom:begin capture-the-prototype-as-primary-source -->
---
instruction_id: capture-the-prototype-as-primary-source
title: Capture the prototype as a primary source
summary: "Fold a validated prototype decision into the real code and keep the prototype itself as a primary source on a throwaway branch, pointed at from the work item."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A prototype has answered its question.
conditions_does_not_apply_when: The prototype is discarded without capturing its answer.
artifact_contract_output_type: captured-prototype
artifact_contract_required_data:
  - folded decision
  - prototype branch
  - context pointer
artifact_contract_verified_by: the decision lives in the real code and the prototype survives on a throwaway branch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/prototype/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Capture the prototype as a primary source
Fold any validated decision into the real code, then capture the prototype itself as a **primary source**: commit it to a throwaway branch, out of main, and leave a context pointer to that branch on the implementation issue. Capture the answer too (the verdict and the question it settled) in the issue or a commit. The main branch keeps only the validated decision.
For a logic prototype: the validated reducer / machine / function set lifts into the real module (the decision, absorbed); the HTML shell rides along to the throwaway branch that keeps the prototype as a primary source, and being one self-contained file, it stays trivially re-runnable there.
For a UI prototype: fold the winner into the existing page and move the rest onto the throwaway branch, not into main.
<!-- vpmodule:atom:end capture-the-prototype-as-primary-source -->
<!-- vpmodule:atom:begin prototype-to-answer-a-question -->
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
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/prototype/SKILL.md
status: active
revision: 3
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
<!-- vpmodule:atom:end prototype-to-answer-a-question -->