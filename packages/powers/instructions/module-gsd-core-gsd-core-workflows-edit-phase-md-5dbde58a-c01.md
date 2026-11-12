---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-edit-phase-md-5dbde58a-c01"
title: "gsd-core: gsd-core/workflows/edit-phase.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/edit-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/edit-phase.md\"}"
atom_ids:
  - guard-the-change-of-finished-work-behind-an-explicit-override
  - replace-only-the-targeted-section-and-leave-the-rest-untouched
  - show-the-current-values-before-you-ask-what-to-change
  - validate-the-cross-references-before-you-write
  - verify-the-derived-scope-after-the-write-and-roll-back
atom_count: 5
atoms: "[{\"atom_id\":\"guard-the-change-of-finished-work-behind-an-explicit-override\",\"file_sha256\":\"5800d86d2ae5304ee626bea49350a7ca25ba123c19ceadc7071a250923eb77ce\",\"content_sha256\":\"6007131fe48190cc8ab51c81b65195a8c8b4c7803acb0ba30a6264593e3b8c53\",\"file_bytes\":1382,\"body_bytes\":292},{\"atom_id\":\"replace-only-the-targeted-section-and-leave-the-rest-untouched\",\"file_sha256\":\"ea8d7a87c2ffdf5fbb51e33478fce5ecf6ec56581acbe532ac0bfef535ef57a5\",\"content_sha256\":\"a932ad2707f4447ac05c52ce46bcd5eef0d5a7ed578666567ca5f3c0e9dacf3b\",\"file_bytes\":1529,\"body_bytes\":458},{\"atom_id\":\"show-the-current-values-before-you-ask-what-to-change\",\"file_sha256\":\"dba1e533b98321ebd7b45a745529feb9e6d879e7e71f457c78be4d659a908355\",\"content_sha256\":\"23af027edf25d22d44ff1e21a6f546feb050b2a8ec5aa3931d8cf07d5eedb934\",\"file_bytes\":1396,\"body_bytes\":334},{\"atom_id\":\"validate-the-cross-references-before-you-write\",\"file_sha256\":\"ab8d22d91e8ef9ffa8e90c86c1c2fc31376acaab972040ac0cad24347c7752d3\",\"content_sha256\":\"26e767295f28fde64edb1c3de027e0c181bf7258812fc0b947135519d09194f6\",\"file_bytes\":1146,\"body_bytes\":182},{\"atom_id\":\"verify-the-derived-scope-after-the-write-and-roll-back\",\"file_sha256\":\"881592d623a13f77e8ef4381375a8869f117d280ffc8960be801dc5d7651b2f5\",\"content_sha256\":\"bf25ad7af7d72a5ce1cc069b69cb9102ed68d62724732bcd736d95e32832f6a7\",\"file_bytes\":1491,\"body_bytes\":363}]"
carrier_sha256: 10cb055e2990fa6e38c832944f776f86be10c61ddb86d137b995ab3f474b9b1a
carrier_bytes: 7785
revision: 1
status: active
---
<!-- vpmodule:atom:begin guard-the-change-of-finished-work-behind-an-explicit-override -->
---
instruction_id: guard-the-change-of-finished-work-behind-an-explicit-override
title: Guard the change of finished work behind an explicit override
summary: "Work that is in progress or finished is not changed without an explicit override, and the override is warned about."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - approval-policy-gate
conditions_applies_when: Work that is in progress or already completed is about to be changed.
conditions_does_not_apply_when: The work has not started yet.
artifact_contract_output_type: edit-request
artifact_contract_required_data:
  - the status of the work
  - the override that was passed
artifact_contract_verified_by: the change was refused without the override and warned about with it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/edit-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Guard the change of finished work behind an explicit override
If status is `in_progress` or `completed` AND `--force` was NOT passed:
Editing an in-progress or completed phase may invalidate executed plans.
Proceeding due to --force.
Don't edit in_progress/completed phases without --force
<!-- vpmodule:atom:end guard-the-change-of-finished-work-behind-an-explicit-override -->
<!-- vpmodule:atom:begin replace-only-the-targeted-section-and-leave-the-rest-untouched -->
---
instruction_id: replace-only-the-targeted-section-and-leave-the-rest-untouched
title: Replace only the targeted section and leave the rest untouched
summary: Only the named section is replaced; everything around it and the numbering stay as they were.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: One section of a larger document is being replaced.
conditions_does_not_apply_when: The whole document is being rewritten.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the replaced section
  - the untouched surroundings
artifact_contract_verified_by: everything before and after the section is unchanged and the numbering is preserved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/edit-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Replace only the targeted section and leave the rest untouched
locate the phase section by its header
and replace exactly the old section text with the new section text.
All content before and after the section (including other phases, milestone headers, and the summary checklist) must be left unchanged.
Don't renumber the phase — number and position must be preserved exactly
Don't modify other phases when editing one
always replace section in place
<!-- vpmodule:atom:end replace-only-the-targeted-section-and-leave-the-rest-untouched -->
<!-- vpmodule:atom:begin show-the-current-values-before-you-ask-what-to-change -->
---
instruction_id: show-the-current-values-before-you-ask-what-to-change
title: Show the current values before you ask what to change
summary: "The current values are shown first, and a field the user does not answer keeps its old value."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An existing record is about to be edited field by field.
conditions_does_not_apply_when: The record is being written from scratch.
artifact_contract_output_type: edit-request
artifact_contract_required_data:
  - the current values
  - the fields the user named
artifact_contract_verified_by: the current values were shown and a field the user did not answer kept its old value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/edit-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Show the current values before you ask what to change
Display the current phase fields clearly:
Ask which fields to edit. For each field the user wants to change, prompt for the new value.
Only fields the user explicitly answers become updates; empty answers preserve the existing value.
**If user chose [3] Cancel:** Exit cleanly.
<!-- vpmodule:atom:end show-the-current-values-before-you-ask-what-to-change -->
<!-- vpmodule:atom:begin validate-the-cross-references-before-you-write -->
---
instruction_id: validate-the-cross-references-before-you-write
title: Validate the cross-references before you write
summary: "Every reference is checked before the write, and an invalid reference blocks it."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: A record that names other records is about to be written.
conditions_does_not_apply_when: The record names nothing.
artifact_contract_output_type: validation-report
artifact_contract_required_data:
  - the references checked
  - the invalid ones
artifact_contract_verified_by: the invalid references blocked the write
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/edit-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Validate the cross-references before you write
validate that every referenced phase number exists
It must not reference itself
Exit (do not write).
invalid references block writes
<!-- vpmodule:atom:end validate-the-cross-references-before-you-write -->
<!-- vpmodule:atom:begin verify-the-derived-scope-after-the-write-and-roll-back -->
---
instruction_id: verify-the-derived-scope-after-the-write-and-roll-back
title: Verify the derived scope after the write and roll back
summary: "A property derived from the whole document is re-derived after the write, and a change rolls the write back."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A write can change a property that is derived from the document as a whole.
conditions_does_not_apply_when: The write cannot change any derived property.
artifact_contract_output_type: write-report
artifact_contract_required_data:
  - the scope before
  - the scope after
  - the restored content
artifact_contract_verified_by: the scope was re-derived after the write and a changed scope restored the previous content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/edit-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Verify the derived scope after the write and roll back
Before writing, capture the current milestone scope (window scope + phase set) so the write can be verified against it:
After writing, re-derive the milestone scope and compare it to the capture:
by replacing the new section text with the original section text, then report and stop
do NOT retry the write
<!-- vpmodule:atom:end verify-the-derived-scope-after-the-write-and-roll-back -->