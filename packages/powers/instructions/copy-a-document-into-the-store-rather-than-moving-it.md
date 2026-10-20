---
instruction_id: copy-a-document-into-the-store-rather-than-moving-it
title: Copy a document into the store rather than moving it
summary: "Bring a document into the planning store by copying it, not by moving it, so the tools that still read the original find it; the plans own the status and the baseline evidence."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "A document from outside is brought into the project's planning store."
conditions_does_not_apply_when: The document has only one reader.
artifact_contract_output_type: work-record
artifact_contract_required_data:
  - the source document
  - the copy
  - the readers that still need the original
artifact_contract_verified_by: the original is still where its other readers find it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/ticketing-setup.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/ticketing-and-epics.md
status: active
revision: 1
---

# Copy a document into the store rather than moving it
Copy a brief, PRD, UX design, or architecture into the initiative folder
Copy, do not move, so other skills still find their files.
