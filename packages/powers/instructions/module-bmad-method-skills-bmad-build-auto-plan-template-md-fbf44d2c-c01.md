---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-plan-template-md-fbf44d2c-c01"
title: "bmad-method: skills/bmad-build-auto/plan-template.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-build-auto/plan-template.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/plan-template.md\"}"
atom_ids:
  - annotate-the-code-map-with-what-to-reuse-and-what-not-to-change
  - delete-an-empty-section-instead-of-writing-none
  - keep-acceptance-criteria-out-of-the-matrix
  - keep-design-notes-only-for-non-obvious-choices
  - keep-one-task-per-file
  - keep-the-implementation-notes-append-only
  - record-the-amendment-with-its-trigger-and-its-keep-instructions
  - write-acceptance-criteria-as-given-when-then
atom_count: 8
atoms: "[{\"atom_id\":\"annotate-the-code-map-with-what-to-reuse-and-what-not-to-change\",\"file_sha256\":\"1eff7b15ccae6727973ad9e9ca40995be3264ec3ece86638390eb567beaf3075\",\"content_sha256\":\"ae2e008073c1deea8038153c48e9324a4c7cd88d2f0f3d431fee64dc4e97c66e\",\"file_bytes\":1554,\"body_bytes\":326},{\"atom_id\":\"delete-an-empty-section-instead-of-writing-none\",\"file_sha256\":\"991201c6cac764e2cc6976250c38f8b3e84010f0a1e8f1e0d8cde7b89e4912a6\",\"content_sha256\":\"4ccdf768dde1ba8481a2067d9c96ffda4faa1dea1ee28f6d080fe0cee0a95b11\",\"file_bytes\":1751,\"body_bytes\":406},{\"atom_id\":\"keep-acceptance-criteria-out-of-the-matrix\",\"file_sha256\":\"58b4d1b3327eb23a7b1f7dce5d6affaa14123fabfd721bec9c04662180e43ed9\",\"content_sha256\":\"066168975e4275952ebc2065ab3732721c7d044ec1b85aff24099972b999bdc2\",\"file_bytes\":1360,\"body_bytes\":220},{\"atom_id\":\"keep-design-notes-only-for-non-obvious-choices\",\"file_sha256\":\"3efbaea6be6f6e1b340061306c4af9bf11b654bb24a2e3a109f7e340417153db\",\"content_sha256\":\"2760753ef811ac8a264374f5318ec1d5cb2008efa793e0902fccc951bd14f94d\",\"file_bytes\":1159,\"body_bytes\":140},{\"atom_id\":\"keep-one-task-per-file\",\"file_sha256\":\"c4ce223fca46aa699b506fbd3a5fda57496e0eb5d1b90d67c037430a75d15de4\",\"content_sha256\":\"d6002d260dc7072fea1b1935a97c33fbe3374ad20ef24df6f4e55b29dc5ebe51\",\"file_bytes\":1174,\"body_bytes\":174},{\"atom_id\":\"keep-the-implementation-notes-append-only\",\"file_sha256\":\"a63750375040983899c90b062ef5c8442e6bab369eb4c3e949d49cb84476332e\",\"content_sha256\":\"ddfaf74514a11dbc239a6bc8be5c899f20eb0c3e4f1c82b929eb9e10f15e1f91\",\"file_bytes\":1249,\"body_bytes\":173},{\"atom_id\":\"record-the-amendment-with-its-trigger-and-its-keep-instructions\",\"file_sha256\":\"b4aa7dcdd910b431b96e67c7d9c062c9c323be8c58ea19a7af0657794041a0cf\",\"content_sha256\":\"ed571037f61d964f04f01c429d855cd0505e87583ae15e2f28b0fa7b4af38d2e\",\"file_bytes\":1646,\"body_bytes\":398},{\"atom_id\":\"write-acceptance-criteria-as-given-when-then\",\"file_sha256\":\"a131a9611e4d283c2c768688d6fbbed09fb884edbfc0f794962e86da47ec36c5\",\"content_sha256\":\"e5e5593d35bb3ea101437170a84d3a892f46cbce8be7b23e3ff27305bc418560\",\"file_bytes\":1393,\"body_bytes\":223}]"
carrier_sha256: 939c3fa4f7c35cf1dda901413d31a84b33acba054414658757545c359e63b286
carrier_bytes: 12485
revision: 1
status: active
---
<!-- vpmodule:atom:begin annotate-the-code-map-with-what-to-reuse-and-what-not-to-change -->
---
instruction_id: annotate-the-code-map-with-what-to-reuse-and-what-not-to-change
title: Annotate the code map with what to reuse and what not to change
summary: "Every path in the map carries its role, so the implementer works from the map instead of searching the codebase blindly."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan maps the files the change touches.
conditions_does_not_apply_when: The change touches one file with no discovery needed.
artifact_contract_output_type: code-map
artifact_contract_required_data:
  - the paths
  - the role of each path
  - what to reuse
  - what not to change
artifact_contract_verified_by: each path in the map carries an annotation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Annotate the code map with what to reuse and what not to change
Agent-populated during planning. Annotated paths prevent blind codebase searching.
Decide which findings actually matter for execution — the specific files, symbols/lines, reuse points, and read-only constraints — and carry those forward for the code map.
<!-- vpmodule:atom:end annotate-the-code-map-with-what-to-reuse-and-what-not-to-change -->
<!-- vpmodule:atom:begin delete-an-empty-section-instead-of-writing-none -->
---
instruction_id: delete-an-empty-section-instead-of-writing-none
title: Delete an empty section instead of writing N/A
summary: A section with nothing to say is removed; the plan never carries a placeholder that says there is nothing.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
  - empty-result-policy
  - empty-result-posture-policy
conditions_applies_when: A section of the plan has no content to put in it.
conditions_does_not_apply_when: Every section has real content.
artifact_contract_output_type: plan-sections
artifact_contract_required_data:
  - the sections kept
  - the sections removed
artifact_contract_verified_by: no section states that it is empty
compatibility_excludes:
  - never-hide-a-gap-in-the-evidence
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/progress.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/verifier-evidence-gate.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Delete an empty section instead of writing N/A
If no meaningful I/O scenarios exist, delete this section. Do not write "N/A" or "None".
If the approach is straightforward, delete this section. Do not write "N/A" or "None".
If no build, test, or lint commands apply, delete this section. Do not write "N/A" or "None".
(Only show this section if count > 0)
so an auditable deferral history remains visible
<!-- vpmodule:atom:end delete-an-empty-section-instead-of-writing-none -->
<!-- vpmodule:atom:begin keep-acceptance-criteria-out-of-the-matrix -->
---
instruction_id: keep-acceptance-criteria-out-of-the-matrix
title: Keep acceptance criteria out of the matrix
summary: The edge-case matrix carries the input and output scenarios; the acceptance criteria carry the system-level behaviour the matrix does not capture.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: The plan carries both an edge-case matrix and acceptance criteria.
conditions_does_not_apply_when: The plan has no edge-case matrix.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the system-level behaviours
  - the scenarios that stay in the matrix
artifact_contract_verified_by: no matrix scenario is repeated in the acceptance criteria and every system-level behaviour has one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep acceptance criteria out of the matrix
If an I/O Matrix is present, include a task to unit-test its edge cases.
AC covers system-level behaviors not captured by the I/O Matrix. Do not duplicate I/O scenarios here.
<!-- vpmodule:atom:end keep-acceptance-criteria-out-of-the-matrix -->
<!-- vpmodule:atom:begin keep-design-notes-only-for-non-obvious-choices -->
---
instruction_id: keep-design-notes-only-for-non-obvious-choices
title: Keep design notes only for non-obvious choices
summary: "Design rationale and examples appear only where the approach is not obvious, and the examples stay short."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan carries a section for design rationale.
conditions_does_not_apply_when: The plan has no design section.
artifact_contract_output_type: design-notes
artifact_contract_required_data:
  - the non-obvious decisions
  - the examples
artifact_contract_verified_by: the rationale appears only for the non-obvious decisions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep design notes only for non-obvious choices
Design rationale and golden examples only when non-obvious. Keep examples to 5–10 lines.
<!-- vpmodule:atom:end keep-design-notes-only-for-non-obvious-choices -->
<!-- vpmodule:atom:begin keep-one-task-per-file -->
---
instruction_id: keep-one-task-per-file
title: Keep one task per file
summary: A task names the file it changes; tightly coupled changes stay in one task rather than being split artificially.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The work is split into tasks.
conditions_does_not_apply_when: The work is one task.
artifact_contract_output_type: task-list
artifact_contract_required_data:
  - the tasks
  - the file each task changes
  - the action
  - the rationale
artifact_contract_verified_by: "each task names one file, or a set of files that cannot be split"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep one task per file
Tasks: backtick-quoted file path -- action -- rationale. Prefer one task per file; group tightly-coupled changes when splitting would be artificial.
<!-- vpmodule:atom:end keep-one-task-per-file -->
<!-- vpmodule:atom:begin keep-the-implementation-notes-append-only -->
---
instruction_id: keep-the-implementation-notes-append-only
title: Keep the implementation notes append-only
summary: "The implementation notes record the decisions, the files touched and the surprises; they are appended to and never removed."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The implementation records what it decided and what it found.
conditions_does_not_apply_when: The work leaves no notes to record.
artifact_contract_output_type: implementation-notes
artifact_contract_required_data:
  - the decisions made
  - the files touched
  - the surprises encountered
artifact_contract_verified_by: the notes grew with the work and nothing was deleted from them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the implementation notes append-only
Agent-owned. Append-only during implementation: decisions made, files touched, surprises encountered. Never delete this section.
<!-- vpmodule:atom:end keep-the-implementation-notes-append-only -->
<!-- vpmodule:atom:begin record-the-amendment-with-its-trigger-and-its-keep-instructions -->
---
instruction_id: record-the-amendment-with-its-trigger-and-its-keep-instructions
title: Record the amendment with its trigger and its keep instructions
summary: "Every amendment to the plan records the finding that caused it, what was amended, the bad state it avoids and what must survive re-derivation."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The plan is amended after a review finding.
conditions_does_not_apply_when: The plan was never amended.
artifact_contract_output_type: plan-change-log
artifact_contract_required_data:
  - the triggering finding
  - what was amended
  - the known-bad state avoided
  - the keep instructions
artifact_contract_verified_by: every amendment carries all four parts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Record the amendment with its trigger and its keep instructions
Each entry records: what finding triggered the change, what was amended, what known-bad state the amendment avoids, and any KEEP instructions (what worked well and must survive re-derivation).
Append a new change-log entry recording: the triggering finding, what was amended, the known-bad state avoided, and the KEEP instructions.
<!-- vpmodule:atom:end record-the-amendment-with-its-trigger-and-its-keep-instructions -->
<!-- vpmodule:atom:begin write-acceptance-criteria-as-given-when-then -->
---
instruction_id: write-acceptance-criteria-as-given-when-then
title: Write acceptance criteria as Given/When/Then
summary: Each acceptance criterion is a Given/When/Then condition the implementer can prove without pointing at the code.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: Acceptance criteria are written for the plan.
conditions_does_not_apply_when: The work has no acceptance criteria.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the precondition
  - the action
  - the expected result
artifact_contract_verified_by: each criterion is a condition the implementer can settle on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write acceptance criteria as Given/When/Then
Given PRECONDITION, when ACTION, then EXPECTED_RESULT
**Testable**: All ACs use Given/When/Then, and each is a check the implementer can prove it met without pointing at code.
<!-- vpmodule:atom:end write-acceptance-criteria-as-given-when-then -->