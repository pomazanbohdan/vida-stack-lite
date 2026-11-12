---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-shapes-agent-shape-md-a7c7358e-c01"
title: "bmad-method: skills/bmad-toolsmith/shapes/agent/shape.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/shapes/agent/shape.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/shapes/agent/shape.md\"}"
atom_ids:
  - choose-the-shape-from-the-work
  - choose-where-each-capability-lives
atom_count: 2
atoms: "[{\"atom_id\":\"choose-the-shape-from-the-work\",\"file_sha256\":\"581dd9a0cc3936172e8eecdb9db4f055311ad23200d5583d2e6fe8fbaf6153e8\",\"content_sha256\":\"a5ce9ca1b15102a1ed4b33bbcebc5c41c973803b716a098536e74ce522873e6d\",\"file_bytes\":4234,\"body_bytes\":2089},{\"atom_id\":\"choose-where-each-capability-lives\",\"file_sha256\":\"0b4432dbac254b1b96be315383ba337dba4c07540155e8b305c851b02d2cf809\",\"content_sha256\":\"3ef96ed5d542164e326da51e57f935ffde57f2eb00810622308d06386409633b\",\"file_bytes\":2096,\"body_bytes\":784}]"
carrier_sha256: 5c5cffa72a26ab94a5f8d5e792cebb1e01384c7709a8dda21b1f2f78daa3c753
carrier_bytes: 6573
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-the-shape-from-the-work -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/script-utility/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/rendered-skill/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/rendered-agent/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/agent/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/single-skill-module/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/multi-skill-module/shape.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
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
When teams must also change what that agent does without forking, it is a rendered agent: its sources are rendered from the declared customization.
One job, no persona: a plain skill.
Must remember between sessions.
The memory itself is many small, well-named files it reads as a conversation reaches them, so it is one continuous self across sessions and the waking cost does not grow with what it knows.
The read-back names one skill, nothing else ships with it, and either it needs an answer that belongs to the project rather than the session (an output folder, a file it maintains, a style) or the user wants the tool to know it
A skill with neither, whose user wants none of that, is a plain skill and needs no record.
The read-back lists two or more skills that ship and install together, or one skill joining a module that already has a record.
<!-- vpmodule:atom:end choose-the-shape-from-the-work -->
<!-- vpmodule:atom:begin choose-where-each-capability-lives -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/agent/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/assets/CAPABILITIES-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
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
<!-- vpmodule:atom:end choose-where-each-capability-lives -->