---
instruction_id: write-the-instruction-block-in-a-fixed-section-order
title: Write the instruction block in a fixed section order
summary: "Use the agreed section order, omit any section with nothing that passes its rule, and write terse imperative lines with a bare fact only as a justification."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - output-formatting
conditions_applies_when: The instruction block of a repository is being written.
conditions_does_not_apply_when: The block already exists and only a few lines change.
artifact_contract_output_type: instruction-block
artifact_contract_required_data:
  - the sections
  - the omitted sections
  - the lines
artifact_contract_verified_by: the sections follow the agreed order and no section was left empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/references/template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write the instruction block in a fixed section order
Sections in this order. Omit any section with nothing that passes its rule — never write an empty one.
Orientation — three or four sentences: what this is, the stack, where planning and deeper docs live.
Policy — what the org requires.
Where things are — entry points, and pointers to children and linked files.
Running and verifying — the right commands to run and the required tool versions, plus what `package.json`, `pyproject.toml`, a `Makefile`, or CI config does not already say.
Conventions that differ from defaults
Known pitfalls
Terse imperative lines under plain headings.
No prose beyond Orientation, no introduction, no summary.
A bare fact appears only as the justification clause of an instruction
A prohibition names the alternative.
At most two emphasis markers in the whole block.
