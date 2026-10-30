---
instruction_id: skip-the-cut-passages-and-merge-the-duplicate-fixes
title: Skip the cut passages and merge the duplicate fixes
summary: "The prose pass leaves the passages the structure pass cut alone, attaches the fixes of a merged passage to the surviving place, and folds repeated issues into one row."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The prose pass runs after the structure pass.
conditions_does_not_apply_when: "The prose pass runs alone, because there is nothing to skip."
artifact_contract_output_type: prose-rows
artifact_contract_required_data:
  - the rows
  - the locations each row covers
  - the uncertain fixes phrased as questions
artifact_contract_verified_by: "no cut passage is edited, every row lists all its locations, and no two rows suggest conflicting fixes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-prose.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Skip the cut passages and merge the duplicate fixes
When the structure pass ran, skip passages it tagged CUT, and attach fixes inside MERGE'd passages to the surviving location.
Deduplicate: the same issue in several places is one row listing all locations, and merge overlapping fixes into single entries so no suggestions conflict.
Phrase uncertain fixes as "Consider: …?" rather than definitive changes.
