---
instruction_id: run-each-lens-on-the-whole-skill-not-the-entry
title: "Run each lens on the whole skill, not the entry"
summary: "A lens reads the metrics first and then every file a model will read, and a finding names the file it is in."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - bounded-artifact-reading
conditions_applies_when: A lens runs over a skill or a set of prompt files.
conditions_does_not_apply_when: There is only one file and it is the entry.
artifact_contract_output_type: lens-coverage
artifact_contract_required_data:
  - the metrics read first
  - the files read
  - the file each finding is in
artifact_contract_verified_by: every prompt file was read and every finding names its file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-contract.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Run each lens on the whole skill, not the entry
Read the metrics first, then every file in `files[]` whose `kind` is `entry` or `prompt`, and any `asset` a model will read as text.
The lens covers the whole skill, not `SKILL.md`; a finding names the file it is in.
Every lens reads it first, then every prompt file the skill has; the lenses judge the whole skill, not the entry alone.
