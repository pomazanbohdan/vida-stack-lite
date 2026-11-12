---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-profile-user-md-e6edd4c6-c01"
title: "gsd-core: gsd-core/workflows/profile-user.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/profile-user.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/profile-user.md\"}"
atom_ids:
  - back-up-the-profile-before-you-overwrite-it
  - clean-up-the-temp-files-you-created
  - fall-back-to-the-other-input-when-the-first-is-empty
  - report-only-what-changed-in-the-profile
  - state-the-confidence-of-a-thin-sample
atom_count: 5
atoms: "[{\"atom_id\":\"back-up-the-profile-before-you-overwrite-it\",\"file_sha256\":\"04ef1119231fa3b300bf96f437d0293eba09d5828784bd94aae24005d0bfeaef\",\"content_sha256\":\"7d6903111d6879a175618b45605bf2751876aa13d8a7cefbc0dd4a787ef08453\",\"file_bytes\":1141,\"body_bytes\":177},{\"atom_id\":\"clean-up-the-temp-files-you-created\",\"file_sha256\":\"18df1cb37fccde0a222b75c04df10db94ad6e3591147425314939dd5f8bacedf\",\"content_sha256\":\"895b7e3a9a7791a500737090f936e8d8a707b1abe9b44a7f7a12c81cde97cc12\",\"file_bytes\":1349,\"body_bytes\":283},{\"atom_id\":\"fall-back-to-the-other-input-when-the-first-is-empty\",\"file_sha256\":\"26ac6f2a88183d38f0b05f9454dcc1babbee136aa5becc2fee7f1711121a11b0\",\"content_sha256\":\"ee4576f705f06dc0d51a5d88364240bd1c978b36a7af39e674ee2f511c8f0ebd\",\"file_bytes\":1205,\"body_bytes\":140},{\"atom_id\":\"report-only-what-changed-in-the-profile\",\"file_sha256\":\"34bf0c7d2ec669578d8ad50ad2af6e8c3d35fb0fe60d6aa5e3d9365aaaf75a1c\",\"content_sha256\":\"c6cb10ed33d12006526faecc290e4862897493a5788d541f08e2737537f4b895\",\"file_bytes\":1281,\"body_bytes\":251},{\"atom_id\":\"state-the-confidence-of-a-thin-sample\",\"file_sha256\":\"6a79e2a6edc38960e3f8261900f2457541b47190644f9f38a61f7c4181d8bb43\",\"content_sha256\":\"a75850f577f79b96f99bbfb96dab85be4903c1136050cb3e144f4481720811ff\",\"file_bytes\":1236,\"body_bytes\":188}]"
carrier_sha256: ad07c2f0d71d13f98598449f7c048f8728694c9680352dce9e1557f03c61794e
carrier_bytes: 6913
revision: 1
status: active
---
<!-- vpmodule:atom:begin back-up-the-profile-before-you-overwrite-it -->
---
instruction_id: back-up-the-profile-before-you-overwrite-it
title: Back up the profile before you overwrite it
summary: The previous profile is kept before a rebuild replaces it.
capability_tags:
  - profile-the-working-style
pattern_tags:
  - prepared-reversal
conditions_applies_when: An existing profile is about to be replaced.
conditions_does_not_apply_when: No profile exists yet.
artifact_contract_output_type: profile-backup
artifact_contract_required_data:
  - the backup that was written
  - the file that was replaced
artifact_contract_verified_by: the previous profile is still recoverable after the rebuild
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/profile-user.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Back up the profile before you overwrite it
Backup existing profile:
Display: "Re-analyzing your sessions to update your profile."
Your existing profile has been backed up to
<!-- vpmodule:atom:end back-up-the-profile-before-you-overwrite-it -->
<!-- vpmodule:atom:begin clean-up-the-temp-files-you-created -->
---
instruction_id: clean-up-the-temp-files-you-created
title: Clean up the temp files you created
summary: The scratch files of the run are removed at the end — and only the ones this run created.
capability_tags:
  - profile-the-working-style
pattern_tags:
  - verification-before-completion
conditions_applies_when: A run created scratch files that hold sampled data.
conditions_does_not_apply_when: The run created no scratch files.
artifact_contract_output_type: cleanup-record
artifact_contract_required_data:
  - the temporary paths that were removed
  - the paths that were left because they were not created by this run
artifact_contract_verified_by: the scratch files of this run are gone and no other path was touched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/profile-user.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Clean up the temp files you created
Remove the temp directory created by profile-sample
contains sample JSONL and analysis JSON
Also remove any standalone temp files created for questionnaire answers:
(Only clean up temp paths that were actually created during this workflow run.)
<!-- vpmodule:atom:end clean-up-the-temp-files-you-created -->
<!-- vpmodule:atom:begin fall-back-to-the-other-input-when-the-first-is-empty -->
---
instruction_id: fall-back-to-the-other-input-when-the-first-is-empty
title: Fall back to the other input when the first is empty
summary: "When the first source of data holds nothing, the run switches to the other one instead of reporting an empty result."
capability_tags:
  - profile-the-working-style
pattern_tags:
  - graceful-degradation
conditions_applies_when: The first source of data turns out to be empty.
conditions_does_not_apply_when: The first source produced data.
artifact_contract_output_type: fallback-notice
artifact_contract_required_data:
  - the source that was empty
  - the source that was used instead
artifact_contract_verified_by: the run continued on the other source and said which one it used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/profile-user.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Fall back to the other input when the first is empty
Display: "No sessions found. Switching to questionnaire."
The fallback is announced.
<!-- vpmodule:atom:end fall-back-to-the-other-input-when-the-first-is-empty -->
<!-- vpmodule:atom:begin report-only-what-changed-in-the-profile -->
---
instruction_id: report-only-what-changed-in-the-profile
title: Report only what changed in the profile
summary: A refreshed profile shows the dimensions that changed and says so when nothing did.
capability_tags:
  - profile-the-working-style
pattern_tags:
  - concise-communication
conditions_applies_when: A profile was rebuilt and is compared with the previous one.
conditions_does_not_apply_when: There is no previous profile to compare against.
artifact_contract_output_type: profile-diff
artifact_contract_required_data:
  - the dimensions that changed
  - the before and after of each
artifact_contract_verified_by: only the changed dimensions are shown and an unchanged profile says so
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/profile-user.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Report only what changed in the profile
Compare each dimension's rating and confidence between old and new. Display diff table showing only changed dimensions:
If nothing changed: Display "No changes detected -- your profile is already up to date."
<!-- vpmodule:atom:end report-only-what-changed-in-the-profile -->
<!-- vpmodule:atom:begin state-the-confidence-of-a-thin-sample -->
---
instruction_id: state-the-confidence-of-a-thin-sample
title: State the confidence of a thin sample
summary: A profile built from too little data says so instead of presenting itself as certain.
capability_tags:
  - profile-the-working-style
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A profile or an estimate is produced from a small sample.
conditions_does_not_apply_when: The sample is large enough to stand on its own.
artifact_contract_output_type: confidence-note
artifact_contract_required_data:
  - the size of the sample
  - the confidence that follows from it
artifact_contract_verified_by: the thin sample is named and the result carries the lower confidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/profile-user.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - research
---

# State the confidence of a thin sample
Note that a questionnaire supplement could improve accuracy.
Display: "Note: Limited session data (N messages). Results may have lower confidence."
<!-- vpmodule:atom:end state-the-confidence-of-a-thin-sample -->