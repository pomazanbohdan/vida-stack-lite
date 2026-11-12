---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-mvp-phase-md-e705ed55-c01"
title: "gsd-core: gsd-core/workflows/mvp-phase.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/mvp-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/mvp-phase.md\"}"
atom_ids:
  - assert-the-written-value-by-reading-it-back
  - re-prompt-only-the-empty-field-and-never-proceed-with-a-partial-artifact
  - validate-the-assembled-artifact-with-the-rule-the-later-check-uses
atom_count: 3
atoms: "[{\"atom_id\":\"assert-the-written-value-by-reading-it-back\",\"file_sha256\":\"485f0cdafa609eec18547dcfb4c8ba359cf774895018c9f838109550f57a6209\",\"content_sha256\":\"5c4dafeb1488bd978510d54da14cb8504a6ca13dca754a7b1932e41b7b52be4d\",\"file_bytes\":1290,\"body_bytes\":223},{\"atom_id\":\"re-prompt-only-the-empty-field-and-never-proceed-with-a-partial-artifact\",\"file_sha256\":\"179328548f6fcba813e4363c24dab480f293aa11af19baf252a21f8ed97533d4\",\"content_sha256\":\"3235494f5a020c6c9311552b6a582361c0e3cd34ae24208cbb6f7227a4a00477\",\"file_bytes\":1545,\"body_bytes\":305},{\"atom_id\":\"validate-the-assembled-artifact-with-the-rule-the-later-check-uses\",\"file_sha256\":\"2b27af95b63b21989ca10b8c26ce429303683a9bc8563eda19e0bda528ebfd5d\",\"content_sha256\":\"99063909cfa977c6e5a479128fe77ca92f9a49fdf5af4e0a4b30ba7d1442501d\",\"file_bytes\":1429,\"body_bytes\":264}]"
carrier_sha256: 3904602ef061c08b7cb9e66447327dd335324bb532adef09239ed608250a4ac4
carrier_bytes: 4799
revision: 1
status: active
---
<!-- vpmodule:atom:begin assert-the-written-value-by-reading-it-back -->
---
instruction_id: assert-the-written-value-by-reading-it-back
title: Assert the written value by reading it back
summary: After a write the value is read back and compared with what was intended; a mismatch is surfaced and the run stops instead of continuing on a half-applied write.
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A value was written into a record.
conditions_does_not_apply_when: The write is not read back in this run.
artifact_contract_output_type: write-assertion
artifact_contract_required_data:
  - the value read back
  - the value intended
  - the discrepancy
artifact_contract_verified_by: no run continues past a write that did not land as intended
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/mvp-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Assert the written value by reading it back
If either assertion fails, surface the discrepancy to the user and exit.
No half-applied write.
Stop and surface it.
Read the value back and compare.
Equality is the criterion.
<!-- vpmodule:atom:end assert-the-written-value-by-reading-it-back -->
<!-- vpmodule:atom:begin re-prompt-only-the-empty-field-and-never-proceed-with-a-partial-artifact -->
---
instruction_id: re-prompt-only-the-empty-field-and-never-proceed-with-a-partial-artifact
title: Re-prompt only the empty field and never proceed with a partial artifact
summary: "An empty answer is re-prompted on its own; the run continues, it does not abort, and no half-filled artefact is ever carried forward."
capability_tags:
  - clarify-requirements
pattern_tags:
  - staged-elicitation
conditions_applies_when: An elicited artefact is assembled from several answers.
conditions_does_not_apply_when: The artefact comes from a document and no question is asked.
artifact_contract_output_type: field-reprompt
artifact_contract_required_data:
  - the field that was empty
  - the re-asked answer
  - the rebuilt artefact
artifact_contract_verified_by: the run continues after the re-prompt and the artefact is complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/mvp-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body governs completion of a generic elicited artifact but does not identify a supported subject domain.
---

# Re-prompt only the empty field and never proceed with a partial artifact
Empty or whitespace-only.
error and re-prompt that single field.
Do not proceed with a partial story.
Do not abort the workflow on first invalid draft.
Re-prompt the offending field(s) per surfaced errors, then re-run validation.
<!-- vpmodule:atom:end re-prompt-only-the-empty-field-and-never-proceed-with-a-partial-artifact -->
<!-- vpmodule:atom:begin validate-the-assembled-artifact-with-the-rule-the-later-check-uses -->
---
instruction_id: validate-the-assembled-artifact-with-the-rule-the-later-check-uses
title: Validate the assembled artifact with the rule the later check uses
summary: "The assembled artefact is checked with the same validator the later verification applies, so it cannot pass here and fail later."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An artefact is assembled from parts and a later stage will check it.
conditions_does_not_apply_when: No later stage checks the artefact.
artifact_contract_output_type: assembly-validation
artifact_contract_required_data:
  - the validator result
  - the fields that were rejected
  - the rebuilt artefact
artifact_contract_verified_by: the later check cannot fail on an artefact that was validated with its own rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/mvp-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Validate the assembled artifact with the rule the later check uses
Validate via the centralized user story validator.
will satisfy the same guard the verifier applies later
Re-run only the offending prompt field(s), rebuild
and validate again before continuing.
<!-- vpmodule:atom:end validate-the-assembled-artifact-with-the-rule-the-later-check-uses -->