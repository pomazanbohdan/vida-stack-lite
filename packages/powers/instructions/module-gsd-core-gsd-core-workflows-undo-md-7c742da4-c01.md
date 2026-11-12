---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-undo-md-7c742da4-c01"
title: "gsd-core: gsd-core/workflows/undo.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/undo.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/undo.md\"}"
atom_ids:
  - fail-closed-when-the-revert-window-cannot-be-bounded
  - report-the-truncation-never-truncate-silently
  - revert-without-resetting-the-history
  - select-commits-by-the-declared-scope-not-by-a-substring
  - warn-before-you-revert-something-a-later-step-depends-on
atom_count: 5
atoms: "[{\"atom_id\":\"fail-closed-when-the-revert-window-cannot-be-bounded\",\"file_sha256\":\"0422ea419b76ade3d521db7ee01eb276f03056573d0309b30d7cbc5dad20933c\",\"content_sha256\":\"3a55df0e4654fbf23f2929de5ba52915d95d48b0632dfb2811c7f33b5e091aef\",\"file_bytes\":1810,\"body_bytes\":572},{\"atom_id\":\"report-the-truncation-never-truncate-silently\",\"file_sha256\":\"cac79f6ae0cb7bc1f37a745ea4c35b6368655eb80deb4229265229f1f0f3c711\",\"content_sha256\":\"838a787b283016f169d54ae61619920bfee515c377455e7a2c153caf0bce73e3\",\"file_bytes\":1399,\"body_bytes\":271},{\"atom_id\":\"revert-without-resetting-the-history\",\"file_sha256\":\"ae1bdeb05bab8f1f5a118192f252e8e4d8784053c0d3425956d59870d92fa9de\",\"content_sha256\":\"00a3755551b36132d9bc890919ff444d9609353991c4fb7f0ac544cb12d3798c\",\"file_bytes\":1632,\"body_bytes\":551},{\"atom_id\":\"select-commits-by-the-declared-scope-not-by-a-substring\",\"file_sha256\":\"4fedc4c6aa7f70b9cc0216b3adfef8e832ea018fba68a3396dca77da213c859f\",\"content_sha256\":\"6e2231dfd2ca336b30ceeb3d6164c23b5bfdbab860eacab26b28fdc34fc0f838\",\"file_bytes\":1832,\"body_bytes\":618},{\"atom_id\":\"warn-before-you-revert-something-a-later-step-depends-on\",\"file_sha256\":\"91fd83cd214e2481098be96ef114621e4e83bb63ade98ff9f8cc8c23ac4c86f1\",\"content_sha256\":\"0d64e4c4c1b18eb65c1c14548a044ee118beb41aa1d8446d9dc1de20afb34ad0\",\"file_bytes\":1472,\"body_bytes\":347}]"
carrier_sha256: 194bd74cd6de2f350ce3fa5281eef4627188b5f06fa7549527333f65f2d81cb0
carrier_bytes: 8922
revision: 1
status: active
---
<!-- vpmodule:atom:begin fail-closed-when-the-revert-window-cannot-be-bounded -->
---
instruction_id: fail-closed-when-the-revert-window-cannot-be-bounded
title: Fail closed when the revert window cannot be bounded
summary: "When the range of commits to revert cannot be pinned down, or when it resolves to an ambiguous place, the rollback stops with its own message; a repository-wide search is never the fallback."
capability_tags:
  - harden-validation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A rollback selects commits by a window that has to be resolved first.
conditions_does_not_apply_when: The window is given explicitly by the caller.
artifact_contract_output_type: window-refusal
artifact_contract_required_data:
  - the unresolved or ambiguous window
  - the reason it is refused
  - the explicit route that replaces it
artifact_contract_verified_by: the rollback stopped with a specific refusal instead of widening its selection
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/undo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Fail closed when the revert window cannot be bounded
**Fail closed when no anchor resolves.** If `UNDO_RANGE` is empty, stop:
An unbounded repository-wide search is never the fallback — that is the defect this anchor replaces.
**Refuse an ARCHIVED resolution — it selects the wrong milestone, not merely too few commits.**
If `PHASE_DIR_ARCHIVED` is non-empty, stop — this message, not the not-found one:
If `PHASE_DIR_FOREIGN` is non-empty, stop with its own message:
And if `PHASE_DIR_REUSED` is non-empty, stop with its own message:
Exit cleanly in every case.
<!-- vpmodule:atom:end fail-closed-when-the-revert-window-cannot-be-bounded -->
<!-- vpmodule:atom:begin report-the-truncation-never-truncate-silently -->
---
instruction_id: report-the-truncation-never-truncate-silently
title: "Report the truncation, never truncate silently"
summary: "When the selection is larger than the operation wants, the count is shown and the operation stops; a partial rollback leaves a worse state than none at all."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A rollback selects more commits than it is willing to take back in one go.
conditions_does_not_apply_when: The selection is small enough to take back whole.
artifact_contract_output_type: truncation-report
artifact_contract_required_data:
  - the number of selected commits
  - the decision to stop
artifact_contract_verified_by: the count was reported and nothing was partially reverted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/undo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Report the truncation, never truncate silently
**Report truncation, never truncate silently.** If the selection exceeds 50 commits, show the count and stop rather than capping — a partial phase revert leaves a worse tree state than either reverting the phase or not:
<!-- vpmodule:atom:end report-the-truncation-never-truncate-silently -->
<!-- vpmodule:atom:begin revert-without-resetting-the-history -->
---
instruction_id: revert-without-resetting-the-history
title: Revert without resetting the history
summary: "A rollback is made by reverting commits, never by resetting; a dirty tree stops the rollback before it starts, and the result is one commit."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: Committed work has to be taken back.
conditions_does_not_apply_when: The work was never committed.
artifact_contract_output_type: revert
artifact_contract_required_data:
  - the commits that were reverted
  - the single commit that records it
artifact_contract_verified_by: "the history was preserved, the tree was clean when the revert started and one commit records the rollback"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/undo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Revert without resetting the history
**HARD CONSTRAINT: Use git revert --no-commit. NEVER use git reset (except for conflict cleanup as documented below).**
**Dirty-tree guard (run first, before any revert):**
Run `git status --porcelain`. If the output is non-empty, display the dirty files and abort:
Exit immediately — do not proceed to any revert operations.
Sort COMMITS in reverse chronological order (newest first).
After all reverts are staged successfully, create a single commit:
git reset --hard is NEVER used anywhere in this workflow
<!-- vpmodule:atom:end revert-without-resetting-the-history -->
<!-- vpmodule:atom:begin select-commits-by-the-declared-scope-not-by-a-substring -->
---
instruction_id: select-commits-by-the-declared-scope-not-by-a-substring
title: "Select commits by the declared scope, not by a substring"
summary: "A commit belongs to a unit of work because its header declares that scope, compared as an exact string; a commit that merely mentions the scope is not a member."
capability_tags:
  - harden-validation
pattern_tags:
  - stable-identity
conditions_applies_when: Commits are selected for a unit of work by the scope their header declares.
conditions_does_not_apply_when: The commits are selected explicitly by the caller.
artifact_contract_output_type: commit-selection
artifact_contract_required_data:
  - the declared scope
  - the target scope
  - the commits that declare it
artifact_contract_verified_by: the selection is made by an exact comparison of the declared scope and nothing is selected by a substring match
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/undo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Select commits by the declared scope, not by a substring
**Selection is a structural parse, not a substring grep (#4661).**
it validates `${TARGET_PHASE}` (refusing before any git command runs on an invalid id), then parses each candidate commit's subject through the SAME anchored `type(scope)!:` conventional-commit header the changelog/PR-title gate uses and compares the DECLARED scope to `${TARGET_PHASE}` by exact string equality
No `--all`:** only commits reachable from `HEAD` may be reverted, because reverting a commit that is not in the current branch's history stages a change the branch never received.
<!-- vpmodule:atom:end select-commits-by-the-declared-scope-not-by-a-substring -->
<!-- vpmodule:atom:begin warn-before-you-revert-something-a-later-step-depends-on -->
---
instruction_id: warn-before-you-revert-something-a-later-step-depends-on
title: Warn before you revert something a later step depends on
summary: "Before a rollback the work that depends on the target is looked for; when something depends on it, the dependency is reported and the person confirms."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A rollback takes back work that later work may build on.
conditions_does_not_apply_when: Nothing depends on the work being taken back.
artifact_contract_output_type: dependency-warning
artifact_contract_required_data:
  - the dependent work
  - the warning
  - the decision
artifact_contract_verified_by: the dependency was reported and the person decided before anything was reverted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/undo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Warn before you revert something a later step depends on
If any downstream phase has started work, collect warnings:
If any later plan references the target plan's outputs, collect warnings:
If user selects "Abort": exit with "Revert cancelled. No changes made."
question: "Downstream work depends on the target being reverted. Proceed anyway?"
<!-- vpmodule:atom:end warn-before-you-revert-something-a-later-step-depends-on -->