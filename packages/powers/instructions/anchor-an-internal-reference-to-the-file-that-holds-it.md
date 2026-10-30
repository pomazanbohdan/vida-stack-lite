---
instruction_id: anchor-an-internal-reference-to-the-file-that-holds-it
title: Anchor an internal reference to the file that holds it
summary: "A reference from one file of a unit to another file of the same unit is relative, and resolved from the directory of the file that holds it."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file points at another file of the same unit.
conditions_does_not_apply_when: The reference points outside the unit or at a file that carries no path.
artifact_contract_output_type: path-rule
artifact_contract_required_data:
  - the referenced file
  - the form of the reference
  - the file that holds it
artifact_contract_verified_by: every internal reference resolves from the directory of the file that holds it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Anchor an internal reference to the file that holds it
Any reference from one file in the skill to another file in the same skill must be a relative path resolved from the directory of the originating file.
Use `./` prefix for siblings or children, `../` for parent traversal.
Bare relative filenames in markdown links (e.g., `[text](sibling.md)`) are also acceptable.
