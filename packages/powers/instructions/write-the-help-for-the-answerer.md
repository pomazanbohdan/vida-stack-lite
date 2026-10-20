---
instruction_id: write-the-help-for-the-answerer
title: Write the help for the answerer
summary: "A help document has one reader, the agent answering a user; it carries what that reader can act on, leaves out the install mechanics and the manifest keys, and stops where the target's own files begin."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A catalogue or help document is written for a reader that has to act on it.
conditions_does_not_apply_when: The document is read by the person who installs or maintains the thing it describes.
artifact_contract_output_type: help-document
artifact_contract_required_data:
  - what each item gives
  - when to recommend it
  - what to offer next
artifact_contract_verified_by: every line in the document is something the reader can act on while answering
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/multi-skill-module/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/multi-skill-module/assets/help-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/single-skill-module/assets/help-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/help.md
status: active
revision: 2
---

# Write the help for the answerer
Help has one reader, the help agent, answering a user: what each skill gives, when to recommend it, what to offer next, where output lands and which setup answer sets it.
Leave out install mechanics and manifest keys, which it cannot act on while answering.
This document should be enough to route the user. Read a topic file only when the question is about its subject.
For how one skill behaves in detail, that skill's own files are the last resort.
