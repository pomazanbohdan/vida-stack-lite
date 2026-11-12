---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-docs-skill-anatomy-md-70bd2a62-c01"
title: "addy-skills: docs/skill-anatomy.md module"
summary: "Carrier for 3 atomic instructions from addy-skills:docs/skill-anatomy.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"docs/skill-anatomy.md\"}"
atom_ids:
  - lay-out-a-skill-directory
  - name-the-skill-after-its-directory
  - write-the-procedure-not-the-workaround
atom_count: 3
atoms: "[{\"atom_id\":\"lay-out-a-skill-directory\",\"file_sha256\":\"f5d2d5560376151377a22f00e6d1ec94aededbdd26e66b27ba54b4b3001532e8\",\"content_sha256\":\"2a2bf6237d7aafea0f968808cb84993113929c6e398f1a1afba8afc71be90a8b\",\"file_bytes\":2121,\"body_bytes\":936},{\"atom_id\":\"name-the-skill-after-its-directory\",\"file_sha256\":\"bb0346b12dc14d1aa6181d1967c862ae7cf8dff5f7a5b448f6514f3366c31e33\",\"content_sha256\":\"82ea859faaa35059884a0fc90d10504d52b8b6d642c1296b6034a8a113b24098\",\"file_bytes\":1608,\"body_bytes\":555},{\"atom_id\":\"write-the-procedure-not-the-workaround\",\"file_sha256\":\"c9e3a1a38641ad2289eb6dfabb07dcdf508bec0c1f5e6270ef61a66f880ab414\",\"content_sha256\":\"e467340726c40ee6cd98161e202e6ab95e46b9f99c63af19d8589e799d62735d\",\"file_bytes\":2553,\"body_bytes\":1331}]"
carrier_sha256: 798fdfd8dd4e3e68279d59bbda7faaaeba8c3f24a04782bc9df94c00bca4e317
carrier_bytes: 6649
revision: 1
status: active
---
<!-- vpmodule:atom:begin lay-out-a-skill-directory -->
---
instruction_id: lay-out-a-skill-directory
title: Lay out the skill directory
summary: "Give a skill its own directory with one required file, and add the helper and reference directories only when the skill needs them."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A skill is created or its directory layout is changed.
conditions_does_not_apply_when: The skill directory exists and its layout is settled.
artifact_contract_output_type: skill-layout
artifact_contract_required_data:
  - directory layout
  - required file
  - optional directories and why
artifact_contract_verified_by: no empty helper or reference directory is left in the skill
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/skill-anatomy.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Lay out the skill directory
Every skill lives in its own directory:

```
skills/
  skill-name/
    SKILL.md           # Required: The skill definition
    scripts/           # Optional: Runnable helpers used by the skill workflow
    references/        # Optional: Skill-specific reference documentation
    supporting-file.md # Optional: Reference material loaded on demand
```

`SKILL.md` is the only required file. Add `scripts/` or `references/` only when the skill actually needs them, and omit them entirely for simpler skills.

If a skill does not need runnable helpers, do not create an empty `scripts/` directory just to mirror other skills. Empty directories add noise without changing how the skill works.

Current convention: material used by exactly one skill is a supporting file inside that skill's directory; material shared across skills goes in `references/`.
No README, changelog or install notes inside the skill.
<!-- vpmodule:atom:end lay-out-a-skill-directory -->
<!-- vpmodule:atom:begin name-the-skill-after-its-directory -->
---
instruction_id: name-the-skill-after-its-directory
title: Name the skill after its directory
summary: "Name the skill in lowercase hyphenated form, match it to its directory, and treat a published name as an identifier others depend on."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A skill is named, renamed or published."
conditions_does_not_apply_when: "The name, the directory and the published form are already fixed."
artifact_contract_output_type: skill-name
artifact_contract_required_data:
  - skill name
  - directory name
  - owner of an alias when renamed
artifact_contract_verified_by: the name in the metadata matches the directory name
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/skill-anatomy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the skill after its directory
`name`: Lowercase, hyphen-separated. Must match the directory name.

Published names are compatibility identifiers.

In particular, a published name is the stable upstream name because other skills refer to it directly.

A downstream catalog may rename it, but that catalog owns the alias or migration mapping; downstream-only aliases are not maintained in this repository.

Skill directories: `lowercase-hyphen-separated`

Skill files: `SKILL.md` (always uppercase)

Supporting files: `lowercase-hyphen-separated.md`
<!-- vpmodule:atom:end name-the-skill-after-its-directory -->
<!-- vpmodule:atom:begin write-the-procedure-not-the-workaround -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/skill-anatomy.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/convert.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Write the procedure, not the workaround
Skills run on many agents and model generations. A step that exists because one model gets a specific call wrong is a liability on every other model: it constrains agents that would have solved the task directly, and it spends turns that stronger models need for the actual work.

**The rule:** if a step cannot be justified without naming a model, a model version, or one agent's private tool name, it belongs in an issue, not in a skill. Describe the capability ("run the focused test command", "write the file"), not the mechanism one runtime happens to expose (`run_command`, `write_to_file`).

Two smells to check for before proposing skill content:

- **Over-specified mechanics.** Prescribing an exact command form or serialization detail where stating the goal alone would do. If the justification is "model X gets this wrong otherwise", it's a workaround, not a procedure.
- **Fragmented diagnostics.** A multi-step inspection sequence where one step would confirm the same thing. Every extra step spends turns, and turn budget is finite.

The host tool's mechanics: its frontmatter keys, slash-command syntax and arguments, conversation starters, knowledge-file uploads. And the instructions the model already follows unasked: be helpful, think step by step, format as markdown.
<!-- vpmodule:atom:end write-the-procedure-not-the-workaround -->