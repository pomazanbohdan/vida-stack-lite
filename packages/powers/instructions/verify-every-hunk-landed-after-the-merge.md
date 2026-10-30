---
instruction_id: verify-every-hunk-landed-after-the-merge
title: Verify every hunk landed after the merge
summary: "After patches are applied the result is compared against the live files, and a dropped or partial hunk is reported with its location."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Patches are applied to a working tree.
conditions_does_not_apply_when: Nothing was patched.
artifact_contract_output_type: hunk-verification
artifact_contract_required_data:
  - the hunk that was checked
  - whether it landed
  - the file and line context of a dropped or partial hunk
artifact_contract_verified_by: every hunk was checked after all patches were applied and no dropped hunk passed silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/post-merge-hunk-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Verify every hunk landed after the merge
After applying local patches post-update, verify that all hunks were actually applied by comparing the expected patch content against the live filesystem.
Surface any dropped or partial hunks immediately rather than silently accepting incomplete merges.
Reapply-patches MUST verify each hunk was applied after the merge
Dropped or partial hunks MUST be reported to the user with file and line context
Verification MUST run after all patches are applied, not per-patch
