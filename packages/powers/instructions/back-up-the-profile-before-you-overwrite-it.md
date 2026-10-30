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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/profile-user.md
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
