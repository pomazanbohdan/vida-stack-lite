---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-lenses-lens-contract-md-91a5f92b-c01"
title: "bmad-method: skills/bmad-toolsmith/lenses/lens-contract.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-toolsmith/lenses/lens-contract.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/lenses/lens-contract.md\"}"
atom_ids:
  - return-findings-in-a-fixed-shape-with-no-padding
  - run-each-lens-on-the-whole-skill-not-the-entry
atom_count: 2
atoms: "[{\"atom_id\":\"return-findings-in-a-fixed-shape-with-no-padding\",\"file_sha256\":\"d1cf4c58a5c48c165844b5ac8d79e4f8f1a0f23a792f0aef8f28433d6e007742\",\"content_sha256\":\"bdcf0ef899a8637ed610756865f8f1a225a53f0a85a44a83d3f7ca6b4cb2ed1c\",\"file_bytes\":1564,\"body_bytes\":336},{\"atom_id\":\"run-each-lens-on-the-whole-skill-not-the-entry\",\"file_sha256\":\"8ad0bc2defce5f0e5c047f88631a63d8ff82d5c4f0005cf7c613e75af8d41819\",\"content_sha256\":\"02c4732ad509e177916b382c407c5920ed031feebd628f853939f92beacc3f4c\",\"file_bytes\":1599,\"body_bytes\":387}]"
carrier_sha256: 7d59ed5e96a5e52e534b195e132fc0674a9610e81a40bf845314f7b894de34f8
carrier_bytes: 3466
revision: 1
status: active
---
<!-- vpmodule:atom:begin return-findings-in-a-fixed-shape-with-no-padding -->
---
instruction_id: return-findings-in-a-fixed-shape-with-no-padding
title: Return findings in a fixed shape with no padding
summary: "The findings come back in one fixed shape in the conversation, an empty list with a passing verdict is a valid answer, and a finding is advice rather than a gate."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
  - code-review
conditions_applies_when: A lens or a review returns its result.
conditions_does_not_apply_when: The result is spoken to the user rather than returned as a structured result.
artifact_contract_output_type: findings-report
artifact_contract_required_data:
  - the lens name
  - the verdict
  - "the findings with their severity, location, evidence and fix"
artifact_contract_verified_by: "the result has the fixed shape, and an empty findings list is allowed when the verdict passes"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Return findings in a fixed shape with no padding
Return exactly this JSON in-context, never as a file
"severity": "Critical | Important | Minor",
An empty `findings` array with a passing verdict is valid. Padding is worse than silence.
Findings are advice to the user, never a gate; the gates are the validators and the trigger eval.
<!-- vpmodule:atom:end return-findings-in-a-fixed-shape-with-no-padding -->
<!-- vpmodule:atom:begin run-each-lens-on-the-whole-skill-not-the-entry -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-contract.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/review.md
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
<!-- vpmodule:atom:end run-each-lens-on-the-whole-skill-not-the-entry -->