---
instruction_id: keep-the-architecture-document-a-build-substrate
title: Keep the architecture document a build substrate
summary: "Keep the document terse and convergent: decisions, not rationale, shape in diagrams rather than prose, and no template comment left in the finished text."
capability_tags:
  - design-structure
pattern_tags:
  - technical-writing
conditions_applies_when: A consistency contract is being finalised for people and small agents to build from.
conditions_does_not_apply_when: The artefact is a discussion document whose purpose is to keep the open questions in front.
artifact_contract_output_type: architecture-document
artifact_contract_required_data:
  - the invariants
  - the diagrams
  - the deferred items
  - the stripped template comments
artifact_contract_verified_by: "the finished document carries no template comment, no rationale and no placeholder"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/assets/spine-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Keep the architecture document a build substrate
Default output is a **build substrate** — terse and convergent, so small agents and humans on small intents don't drift.
Record decisions, not rationale (rationale lives in the memlog).
Carry shape in diagrams, not prose.
The template's `<!-- -->` notes are guidance — act on them, then strip them; the finished spine carries no template comment, and only the diagrams that convey the structure (as many as the altitude needs, valid mermaid).
