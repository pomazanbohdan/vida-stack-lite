---
instruction_id: choose-the-shape-from-the-work
title: Choose the shape from the work
summary: "Pick the shape the work needs: a plain skill, a script utility, a rendered skill, an agent with a menu, a memory agent, or a record that groups several skills."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A skill or an agent is about to be built and its shape has not been decided.
conditions_does_not_apply_when: The shape is already fixed by an existing skill or an existing record.
artifact_contract_output_type: shape-decision
artifact_contract_required_data:
  - the shape
  - the signal that chose it
artifact_contract_verified_by: the chosen shape names the signal from the request that points to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/script-utility/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/rendered-skill/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/agent/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/single-skill-module/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/multi-skill-module/shape.md
status: active
revision: 1
---

# Choose the shape from the work
A `SKILL.md` an agent reads and follows, with references, scripts or assets only where the body would otherwise have to carry them.
Most skills are this one.
The conversation has reached it when the read-back names no persona or menu, no steps a team must swap, and work that is judgment rather than a deterministic transform.
It is also where a build lands when no signal points elsewhere.
The conversation has reached it when the job is deterministic: the same input gives the same output, success is checkable, and a model doing it by hand would be slower and less reliable than code (file transforms, extraction, counting, validation, driving a fixed CLI).
The prose only tells the agent how to run the script and what to do with the result.
The conversation has reached it when teams must change what the skill does (not only add facts), when a selector chooses between routes, or when the body is long enough to split into steps loaded one at a time.
An agent is a persona with a menu: one character the user talks to, whose capabilities are installed skills or prompts inside it.
Reach it when the user wants someone to talk to (a name, a role, a way of working) who does several related things.
One job, no persona: a plain skill.
Must remember between sessions.
The memory itself is many small, well-named files it reads as a conversation reaches them, so it is one continuous self across sessions and the waking cost does not grow with what it knows.
The read-back names one skill, nothing else ships with it, and either it needs an answer that belongs to the project rather than the session (an output folder, a file it maintains, a style) or the user wants the tool to know it
A skill with neither, whose user wants none of that, is a plain skill and needs no record.
The read-back lists two or more skills that ship and install together, or one skill joining a module that already has a record.
