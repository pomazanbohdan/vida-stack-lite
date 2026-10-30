---
instruction_id: replace-the-section-you-own-never-append-a-duplicate
title: "Replace the section you own, never append a duplicate"
summary: "A section written after a review replaces the previous version of that section; it is never appended to, and it is written after the review so a later rewrite cannot clobber it."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A generated section is written into a document that may already carry that section.
conditions_does_not_apply_when: The document never carried the section before.
artifact_contract_output_type: regenerated-section
artifact_contract_required_data:
  - the section
  - the previous version it replaces
artifact_contract_verified_by: the document carries exactly one version of the section
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ui-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Replace the section you own, never append a duplicate
Run AFTER the checker approves the UI-SPEC (VERIFIED, or force-approved at step 9) — never inline during authoring, so a revision-loop researcher rewrite (step 9) cannot clobber the section and the `## UI Considerations` block is committed with the FINAL UI-SPEC.
IDEMPOTENT: if a `## UI Considerations` section already exists, REPLACE it — never append a duplicate.
