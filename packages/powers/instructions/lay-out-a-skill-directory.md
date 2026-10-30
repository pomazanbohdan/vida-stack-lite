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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/skill-anatomy.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
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
