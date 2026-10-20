---
instruction_id: write-the-procedure-not-the-workaround
title: "Write the procedure, not the workaround"
summary: "Write a skill step that any agent can follow: describe the capability, not the mechanism one runtime happens to expose."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A skill step is justified by the behavior of one model or one runtime.
conditions_does_not_apply_when: The step describes an operation any agent can perform.
artifact_contract_output_type: model-neutral-guidance
artifact_contract_required_data:
  - step
  - capability it requires
  - mechanism it must not name
artifact_contract_verified_by: "no step names a model, a model version or one runtime's private tool"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/skill-anatomy.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/convert.md
status: active
revision: 2
---

# Write the procedure, not the workaround
Skills run on many agents and model generations. A step that exists because one model gets a specific call wrong is a liability on every other model: it constrains agents that would have solved the task directly, and it spends turns that stronger models need for the actual work.

**The rule:** if a step cannot be justified without naming a model, a model version, or one agent's private tool name, it belongs in an issue, not in a skill. Describe the capability ("run the focused test command", "write the file"), not the mechanism one runtime happens to expose (`run_command`, `write_to_file`).

Two smells to check for before proposing skill content:

- **Over-specified mechanics.** Prescribing an exact command form or serialization detail where stating the goal alone would do. If the justification is "model X gets this wrong otherwise", it's a workaround, not a procedure.
- **Fragmented diagnostics.** A multi-step inspection sequence where one step would confirm the same thing. Every extra step spends turns, and turn budget is finite.

The host tool's mechanics: its frontmatter keys, slash-command syntax and arguments, conversation starters, knowledge-file uploads. And the instructions the model already follows unasked: be helpful, think step by step, format as markdown.
