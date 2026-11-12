---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-thinking-models-verification-md-8d9de9c6-c01"
title: "gsd-core: gsd-core/references/thinking-models-verification.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/thinking-models-verification.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/thinking-models-verification.md\"}"
atom_ids:
  - calibrate-the-planning-fallacy-against-the-file-and-api-count
  - invert-the-verification-and-look-for-three-ways-it-is-wrong
  - run-the-disconfirmation-pass-even-when-the-verification-passes
atom_count: 3
atoms: "[{\"atom_id\":\"calibrate-the-planning-fallacy-against-the-file-and-api-count\",\"file_sha256\":\"7d6fdae9e370066b5d4ebb9fe1352581ace163b7fee87023c95280d6768b7293\",\"content_sha256\":\"935b2ce535820a25782d6325e51cd39463160234afa5e778093f8d0d14ec82f1\",\"file_bytes\":1436,\"body_bytes\":357},{\"atom_id\":\"invert-the-verification-and-look-for-three-ways-it-is-wrong\",\"file_sha256\":\"8339254c11ac9ab31215a0d5a1f819baf69b24318e7fec048d61259271575bd2\",\"content_sha256\":\"9dcf8e01b5ff6fa965e6fce08bc5471a6e02f1862ef42cf9c681ad8488aebe4c\",\"file_bytes\":1760,\"body_bytes\":628},{\"atom_id\":\"run-the-disconfirmation-pass-even-when-the-verification-passes\",\"file_sha256\":\"a77169c37010cf221588f6d1a19a2ef41578cdc4d4a5368c9db35f1377205cb7\",\"content_sha256\":\"0565fdf63052ba7cbd3625c06279a864f15296e1761f217aeb1dd5b3b192a287\",\"file_bytes\":1522,\"body_bytes\":361}]"
carrier_sha256: 1c10a0f1c4de967171a72b3afdaf475e66c5a36e6dde16c4a2e719492934df97
carrier_bytes: 5255
revision: 1
status: active
---
<!-- vpmodule:atom:begin calibrate-the-planning-fallacy-against-the-file-and-api-count -->
---
instruction_id: calibrate-the-planning-fallacy-against-the-file-and-api-count
title: Calibrate the planning fallacy against the file and API count
summary: "A task called simple is checked against the files it touches, the APIs it needs and the infrastructure it modifies."
capability_tags:
  - review-code
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A plan estimates a task as simple or small.
conditions_does_not_apply_when: The task is a one-line change.
artifact_contract_output_type: effort-calibration
artifact_contract_required_data:
  - the files touched
  - the unfamiliar APIs
  - the shared infrastructure
artifact_contract_verified_by: the estimate was checked against the three signals
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Calibrate the planning fallacy against the file and API count
For each task estimated as "simple" or "small", check: does it touch more than 2 files? Does it require understanding an unfamiliar API? Does it modify shared infrastructure? If yes to any, flag as likely underestimated. Plans with >5 tasks or tasks touching >4 files per task are over-scoped
<!-- vpmodule:atom:end calibrate-the-planning-fallacy-against-the-file-and-api-count -->
<!-- vpmodule:atom:begin invert-the-verification-and-look-for-three-ways-it-is-wrong -->
---
instruction_id: invert-the-verification-and-look-for-three-ways-it-is-wrong
title: Invert the verification and look for three ways it is wrong
summary: "Instead of checking what is right, three specific ways the work could be wrong despite passing are listed and each gets a concrete check."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: An implementation passes its tests and is being verified.
conditions_does_not_apply_when: The verification is a re-check of items that already passed.
artifact_contract_output_type: inversion-list
artifact_contract_required_data:
  - the three ways it could be wrong
  - the concrete check for each
artifact_contract_verified_by: three failure modes were listed and each has a check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Invert the verification and look for three ways it is wrong
Instead of checking what IS correct, list 3 specific ways this implementation could be WRONG despite passing tests: missing edge cases, silent data loss, race conditions, unhandled error paths. For each, write a concrete check (grep for pattern, test with specific input, verify error handling exists). Additionally, check whether any documented DEVIATION in SUMMARY.md changes the meaning or applicability of a must-have. If a must-have was written assuming approach A but the executor used approach B, the must-have may need reinterpretation, not literal checking
<!-- vpmodule:atom:end invert-the-verification-and-look-for-three-ways-it-is-wrong -->
<!-- vpmodule:atom:begin run-the-disconfirmation-pass-even-when-the-verification-passes -->
---
instruction_id: run-the-disconfirmation-pass-even-when-the-verification-passes
title: Run the disconfirmation pass even when the verification passes
summary: "After the first verification pass, one partly met requirement, one misleading test and one uncovered error path are searched for and reported."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The first verification pass has finished.
conditions_does_not_apply_when: The run is a re-verification of items that already passed.
artifact_contract_output_type: disconfirmation-pass
artifact_contract_required_data:
  - the partly met requirement
  - the misleading test
  - the uncovered error path
artifact_contract_verified_by: the three findings are reported even though the verification passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/thinking-models-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Run the disconfirmation pass even when the verification passes
After your initial verification pass, do a DISCONFIRMATION pass: (1) find one requirement that is only partially met, (2) find one test that passes but does not actually test the stated behavior, (3) find one error path that has no test coverage. Report these even if overall verification passes
<!-- vpmodule:atom:end run-the-disconfirmation-pass-even-when-the-verification-passes -->