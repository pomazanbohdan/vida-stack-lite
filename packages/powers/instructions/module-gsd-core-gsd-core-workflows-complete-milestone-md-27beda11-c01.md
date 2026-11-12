---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-complete-milestone-md-27beda11-c01"
title: "gsd-core: gsd-core/workflows/complete-milestone.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/complete-milestone.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/complete-milestone.md\"}"
atom_ids:
  - commit-the-new-state-before-removing-the-old
  - mark-a-milestone-only-when-something-shipped
  - re-append-the-extracted-section-verbatim
atom_count: 3
atoms: "[{\"atom_id\":\"commit-the-new-state-before-removing-the-old\",\"file_sha256\":\"6d835695c2ea5e347d6cc33504d9d5cac4609ed6f4da24bc73923afe5c20d38b\",\"content_sha256\":\"7fb48078f4ffa56f7cc86e3f30d7555438da61db815f82899d2bc8e9ab6fb99d\",\"file_bytes\":1390,\"body_bytes\":315},{\"atom_id\":\"mark-a-milestone-only-when-something-shipped\",\"file_sha256\":\"6673acb4524136ad9433a70969f4c1e5efd7503ea6619948cb4d5d51c578f03d\",\"content_sha256\":\"fee240ac4f8d041ddc451a49dc0695c714bb64401e39fb7bf909941c59ed7f31\",\"file_bytes\":1441,\"body_bytes\":393},{\"atom_id\":\"re-append-the-extracted-section-verbatim\",\"file_sha256\":\"3320c32af8f1fcda33a3bc9f86d2635b4177b957b8016baa89003ee7ebeaa1b8\",\"content_sha256\":\"7e4659638348f9061a65a46ca2f130c7fd3005e09d463b43ca7f39316b85d48e\",\"file_bytes\":1309,\"body_bytes\":226}]"
carrier_sha256: 1798a47b59549d4cba8ee3f734efb4b6be02d284268087dc6647bdc4ca73d364
carrier_bytes: 4569
revision: 1
status: active
---
<!-- vpmodule:atom:begin commit-the-new-state-before-removing-the-old -->
---
instruction_id: commit-the-new-state-before-removing-the-old
title: Commit the new state before removing the old
summary: "The archives and the rewritten record are committed as a checkpoint before the originals are deleted, so the history can rebuild the tree if the next step fails."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - revertable-increments
conditions_applies_when: A record is rewritten and its original is about to be deleted.
conditions_does_not_apply_when: Nothing is deleted.
artifact_contract_output_type: safety-checkpoint
artifact_contract_required_data:
  - the checkpoint commit
  - the originals removed after it
artifact_contract_verified_by: the checkpoint commit exists before the removal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/complete-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Commit the new state before removing the old
Safety commit - commit archive files BEFORE deleting any originals:
Commit archives as a safety checkpoint before removing originals.
This creates a durable checkpoint in git history. If anything fails after this point, the working tree can be reconstructed from git.
<!-- vpmodule:atom:end commit-the-new-state-before-removing-the-old -->
<!-- vpmodule:atom:begin mark-a-milestone-only-when-something-shipped -->
---
instruction_id: mark-a-milestone-only-when-something-shipped
title: Mark a milestone only when something shipped
summary: "A milestone is marked for a release, a shipped feature set or an archive, never for a finished phase or work in progress."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: A point in the work could be marked as a milestone.
conditions_does_not_apply_when: Something shipped.
artifact_contract_output_type: milestone-decision
artifact_contract_required_data:
  - the decision
  - the reason in terms of what shipped
artifact_contract_verified_by: the milestone was marked for something shipped and not for a finished phase
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/complete-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Mark a milestone only when something shipped
**Create milestones for:** Initial release, public releases, major feature sets shipped, before archiving planning.
**Don't create milestones for:** Every phase completion (too granular), work in progress, internal dev iterations (unless truly shipped).
Heuristic: "Is this deployed/usable/shipped?" If yes → milestone. If no → keep working.
<!-- vpmodule:atom:end mark-a-milestone-only-when-something-shipped -->
<!-- vpmodule:atom:begin re-append-the-extracted-section-verbatim -->
---
instruction_id: re-append-the-extracted-section-verbatim
title: Re-append the extracted section verbatim
summary: "The section that a rewrite would drop is extracted before the rewrite and appended back verbatim afterwards, so nothing is silently lost."
capability_tags:
  - curate-context
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A record is rewritten and it holds a section the rewrite would drop.
conditions_does_not_apply_when: The record holds no such section.
artifact_contract_output_type: preserved-section
artifact_contract_required_data:
  - the extracted section
  - the rewritten record it was appended to
artifact_contract_verified_by: the extracted section appears verbatim in the rewritten record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/complete-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-append the extracted section verbatim
Append the extracted Backlog content verbatim to the end of the newly written ROADMAP.md.
This ensures 999.x backlog items are never silently dropped during milestone reorganization.
<!-- vpmodule:atom:end re-append-the-extracted-section-verbatim -->