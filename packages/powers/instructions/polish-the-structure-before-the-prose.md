---
instruction_id: polish-the-structure-before-the-prose
title: Polish the structure before the prose
summary: "Run the structural passes first and the prose passes last, so the prose never polishes text that is about to be cut."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A document is being polished in passes.
conditions_does_not_apply_when: Only one pass is being made over the text.
artifact_contract_output_type: polish-order
artifact_contract_required_data:
  - the pass order
  - the passes applied in that order
artifact_contract_verified_by: the structural passes ran before the prose passes and the polish came after the reviewer fixes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 1
---

# Polish the structure before the prose
Polish goes last so it does not redo work after reviewer fixes.
structural passes before prose — prose should not polish soon-to-be-cut text
Parallelize across documents, sequential within.
Run passes as parallel subagents - apply all doc standards to the
document first, then
the addendum
so we present a high-quality draft for the user to review and finalize.
