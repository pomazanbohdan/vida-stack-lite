---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-keep-planning-docs-private-md-50358575-c01"
title: "gsd-core: docs/how-to/keep-planning-docs-private.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/keep-planning-docs-private.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/keep-planning-docs-private.md\"}"
atom_ids:
  - check-the-second-order-effect-of-removing-a-file-the-workers-read
  - untrack-what-the-ignore-rule-cannot-reach
atom_count: 2
atoms: "[{\"atom_id\":\"check-the-second-order-effect-of-removing-a-file-the-workers-read\",\"file_sha256\":\"c718d5a82f9222514ca0b918d290cd7782e0089fcab8f2642e26b898dc02f5bf\",\"content_sha256\":\"4604a33a41a20d1672d4eb35409153af9b17078a690083d1142bd2949cb082f5\",\"file_bytes\":1476,\"body_bytes\":364},{\"atom_id\":\"untrack-what-the-ignore-rule-cannot-reach\",\"file_sha256\":\"08534c6e8697d8feb44010b058a9f308c23629fad7c1867127751c03380ba46e\",\"content_sha256\":\"08c7e905a1aa4ea693ae7ef754402591209ba90a576466eeb0203c1aa8564598\",\"file_bytes\":1581,\"body_bytes\":335}]"
carrier_sha256: f1749299cb161f355ad2315cd99bed459c7d70b7446ab8f8d7526c7727acaa30
carrier_bytes: 3384
revision: 1
status: active
---
<!-- vpmodule:atom:begin check-the-second-order-effect-of-removing-a-file-the-workers-read -->
---
instruction_id: check-the-second-order-effect-of-removing-a-file-the-workers-read
title: Check the second-order effect of removing a file the workers read
summary: Taking a file out of version control also takes it out of the checkout every isolated worker starts from.
capability_tags:
  - assess-change-impact
pattern_tags:
  - change-impact-assessment
conditions_applies_when: A file that isolated workers read is about to leave the tracked set.
conditions_does_not_apply_when: No worker reads the file.
artifact_contract_output_type: impact-note
artifact_contract_required_data:
  - the file that leaves the tracked set
  - what the workers lose with it
artifact_contract_verified_by: the consequence for the isolated workers is named before the removal is made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/keep-planning-docs-private.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Check the second-order effect of removing a file the workers read
**parallel executor worktrees stop working.** A worktree is checked out from a commit, so an untracked or ignored `.planning/` does not exist inside it and the executor has no `PLAN.md` to read. Untracked planning also has no git history, so `/gsd-undo` and revert paths have nothing to restore.
<!-- vpmodule:atom:end check-the-second-order-effect-of-removing-a-file-the-workers-read -->
<!-- vpmodule:atom:begin untrack-what-the-ignore-rule-cannot-reach -->
---
instruction_id: untrack-what-the-ignore-rule-cannot-reach
title: Untrack what the ignore rule cannot reach
summary: An ignore rule stops new files from being picked up; the files already tracked are untracked explicitly or they keep being staged.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: Files that should stop being tracked are still tracked.
conditions_does_not_apply_when: The files were never tracked.
artifact_contract_output_type: untracking-record
artifact_contract_required_data:
  - the paths that were untracked
  - the check that shows they are no longer tracked
artifact_contract_verified_by: the paths are no longer tracked and the files remain on disk
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/keep-planning-docs-private.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body explains .gitignore and --cached effects but gives no clear judgment principle, conditional choice, ordered procedure, or checklist; the four-form contract does not support a forced form."
---

# Untrack what the ignore rule cannot reach
**.gitignore** only stops git picking up *new* files. It has no effect on files already committed — git keeps tracking those, so `git add -A` keeps staging them even though steps 1 and 2 are both done.
`--cached` removes the files from the index only — your files on disk are untouched.
<!-- vpmodule:atom:end untrack-what-the-ignore-rule-cannot-reach -->