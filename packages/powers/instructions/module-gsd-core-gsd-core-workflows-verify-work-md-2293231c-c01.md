---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-verify-work-md-2293231c-c01"
title: "gsd-core: gsd-core/workflows/verify-work.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/verify-work.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/verify-work.md\"}"
atom_ids:
  - a-produced-artefact-can-deepen-the-checkpoints-but-not-rewrite-them
  - block-the-advance-until-the-owners-verification-passes
  - classify-the-user-response-into-a-fixed-set
  - count-an-unrecognized-severity-as-critical
  - count-the-unresolved-issues-not-the-raw-issues
  - inject-a-cold-start-smoke-test-when-the-entry-paths-changed
  - keep-a-deferred-item-out-of-the-defect-list
  - never-drop-a-deliverable-when-a-coverage-block-is-broken
atom_count: 8
atoms: "[{\"atom_id\":\"a-produced-artefact-can-deepen-the-checkpoints-but-not-rewrite-them\",\"file_sha256\":\"abb8a02f74f963d0e93b295c92aa75f90d00db84081e6c488c6acfc38fc52660\",\"content_sha256\":\"871c43a21f1d7a62963743b869f3f093814f2cc0b7f2e48772d71cfb930b3341\",\"file_bytes\":2019,\"body_bytes\":776},{\"atom_id\":\"block-the-advance-until-the-owners-verification-passes\",\"file_sha256\":\"1eb0285643848debc8f71612d9e88a836e4e3361b28f44749ef4bc9498125ab6\",\"content_sha256\":\"ebbaabae9891cab1ba256895a5bc0144fd175e3821d4e6ec1de4e10b1fda3c66\",\"file_bytes\":1497,\"body_bytes\":361},{\"atom_id\":\"classify-the-user-response-into-a-fixed-set\",\"file_sha256\":\"29a40741d19658c4b78e5e0dbbe6322e23af6de5bdaa3ab0f2c4d87781138abe\",\"content_sha256\":\"fde0ad8b848a3ade4a092f692292806d69397ba67878a11d15bf470a5adb1dd7\",\"file_bytes\":1477,\"body_bytes\":384},{\"atom_id\":\"count-an-unrecognized-severity-as-critical\",\"file_sha256\":\"60f3ad61a8f7c597d3956fbe34d9882050652ea0d2d5182dcc7cfd67ed0fdd21\",\"content_sha256\":\"075ef94987b0dff3eef21d57ea23af12c017c177d0eefc190c01326488d43cac\",\"file_bytes\":1477,\"body_bytes\":250},{\"atom_id\":\"count-the-unresolved-issues-not-the-raw-issues\",\"file_sha256\":\"fcc9a5ad7f3b6dd6958ff92649c0375656b8a4b8cf505dc79526df78bc0f7763\",\"content_sha256\":\"e5a674e820534228f8e0b398b8d57f5698b38ee81bae7f94b3de7f303e09b3ce\",\"file_bytes\":1965,\"body_bytes\":673},{\"atom_id\":\"inject-a-cold-start-smoke-test-when-the-entry-paths-changed\",\"file_sha256\":\"4c3afcf425bcc2a30e184331e1e9cdb0ba72bec5ed7edb1be00d55dcbfd13f88\",\"content_sha256\":\"affbfa41c9dcb5946051dbd6f8ce0bbf6a0bdd66f6a0be25874d400989c6e8ab\",\"file_bytes\":1606,\"body_bytes\":438},{\"atom_id\":\"keep-a-deferred-item-out-of-the-defect-list\",\"file_sha256\":\"7077c131defff31bdf39b9efa5b5e0e7689897537b3055fef398f68d1c36ac0b\",\"content_sha256\":\"83ca8aa84d65c77e9b3e1f1e184fc0536723b3b3b5e26a7bb5fc76e894a40dfd\",\"file_bytes\":1511,\"body_bytes\":343},{\"atom_id\":\"never-drop-a-deliverable-when-a-coverage-block-is-broken\",\"file_sha256\":\"2bf63402ef022f56663f857b5b91f55a5c512c4823ea76aa5f1aa7318b5ceda4\",\"content_sha256\":\"80ff385744d38b58a6887834f4bb36113ebd10c826bb2835e6b2d45b1e6117df\",\"file_bytes\":1885,\"body_bytes\":639}]"
carrier_sha256: b3f240a479ff619446f8c24855f2f454b7f9fbe9c8d6ce4b60a078ac6ce34775
carrier_bytes: 14720
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-produced-artefact-can-deepen-the-checkpoints-but-not-rewrite-them -->
---
instruction_id: a-produced-artefact-can-deepen-the-checkpoints-but-not-rewrite-them
title: A produced artefact can deepen the checkpoints but not rewrite them
summary: "The checkpoints that another step produced are merged into the list and never subtracted from it, and a name that could reach outside the working area is refused before it is resolved."
capability_tags:
  - verify-work-results
pattern_tags:
  - defense-in-depth
conditions_applies_when: Another step in the same run produced a list of checkpoints that could be merged into the test list.
conditions_does_not_apply_when: No other step produced anything.
artifact_contract_output_type: merged-checkpoints
artifact_contract_required_data:
  - the produced entries
  - the merged list
  - the refused names
artifact_contract_verified_by: the merged list only grew and the earlier wording of a checkpoint was never rewritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# A produced artefact can deepen the checkpoints but not rewrite them
Merged entries are added to, never subtracted from, what `coverage:` classification and the prose fallback produce.
Deduplicate against already-derived checkpoints by `name`, keeping the earlier entry's `expected` text so a produced artefact cannot silently rewrite a criterion.
A name with no artefact on disk means that step was inactive, skipped, or failed. Note it to the user and derive normally — **never drop a deliverable and never block UAT over it.**
A name carrying `/`, `..`, a leading `-`, a leading path separator, or any shell metacharacter is a malformed manifest: record a warning, skip that name, continue.
Only a validated name is resolved, and only against what the step wrote inside
<!-- vpmodule:atom:end a-produced-artefact-can-deepen-the-checkpoints-but-not-rewrite-them -->
<!-- vpmodule:atom:begin block-the-advance-until-the-owners-verification-passes -->
---
instruction_id: block-the-advance-until-the-owners-verification-passes
title: "Block the advance until the owner's verification passes"
summary: "The work is not closed while the verification that owns the decision still reports a blocker; the blockers and the owner's next command are shown."
capability_tags:
  - verify-work-results
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The checks passed but the verification that owns the closing decision has not.
conditions_does_not_apply_when: The owning verification passed.
artifact_contract_output_type: advance-block
artifact_contract_required_data:
  - the blockers
  - "the owner's next command"
  - the route to resume
artifact_contract_verified_by: "the advance stopped with the blockers and the owner's command shown"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Block the advance until the owner's verification passes
If `PHASE_COMPLETE_PASSED` is not `true`, stop before phase advancement and present:
All UAT tests passed, but phase advancement is blocked until canonical verification passes.
Blocking completion:
`$NEXT_COMMAND` — the verification owner's next command (when non-empty)
resume UAT if blockers remain
<!-- vpmodule:atom:end block-the-advance-until-the-owners-verification-passes -->
<!-- vpmodule:atom:begin classify-the-user-response-into-a-fixed-set -->
---
instruction_id: classify-the-user-response-into-a-fixed-set
title: Classify the user response into a fixed set
summary: "An answer is read as a pass, a skip, a block, a deferral or an issue; a block is not a defect and never becomes one."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A person answered a checkpoint and the answer has to be turned into a record.
conditions_does_not_apply_when: The answer is already recorded as a verdict.
artifact_contract_output_type: checkpoint-result
artifact_contract_required_data:
  - the answer
  - the class it was read as
  - the reason
artifact_contract_verified_by: every answer was read as one of the fixed classes and a block stayed out of the defect list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Classify the user response into a fixed set
**If response indicates pass:**
Empty response, "yes", "y", "ok", "pass", "next", "approved", "✓"
**If response indicates skip:**
**If response indicates blocked:**
Note: Blocked tests do NOT go into the Gaps section (they aren't code issues — they're prerequisite gates).
**If response is anything else:**
Treat as issue description
<!-- vpmodule:atom:end classify-the-user-response-into-a-fixed-set -->
<!-- vpmodule:atom:begin count-an-unrecognized-severity-as-critical -->
---
instruction_id: count-an-unrecognized-severity-as-critical
title: Count an unrecognized severity as critical
summary: "An entry whose severity is missing or not one of the known levels is treated as the worst level, and an entry that is explicitly the lowest level stays advisory and never enters the loop."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A checker returned findings with severities that may be missing or unknown.
conditions_does_not_apply_when: Every finding carries one of the known severities.
artifact_contract_output_type: severity-count
artifact_contract_required_data:
  - the entries that must be fixed
  - the entries that are advisory
  - the entries with an unknown severity
artifact_contract_verified_by: an unknown severity counted as the worst level and the advisory entries stayed out of the loop
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Count an unrecognized severity as critical
Count the entries that must be fixed, treat an entry whose severity is missing or unrecognized as Critical (fail closed), and treat an entry explicitly marked Minor as advisory that never enters the loop.
<!-- vpmodule:atom:end count-an-unrecognized-severity-as-critical -->
<!-- vpmodule:atom:begin count-the-unresolved-issues-not-the-raw-issues -->
---
instruction_id: count-the-unresolved-issues-not-the-raw-issues
title: "Count the unresolved issues, not the raw issues"
summary: An issue counts as unresolved unless it was verified as resolved; a test with several issue records stays unresolved while any one of them is open.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: The number of issues decides what happens next.
conditions_does_not_apply_when: Every recorded issue is still open.
artifact_contract_output_type: unresolved-issue-count
artifact_contract_required_data:
  - the count
  - the entries that were counted
  - the entries that were treated as resolved
artifact_contract_verified_by: only the entries without a verified resolution were counted and one open regression kept its test unresolved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work/detail/elaboration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Count the unresolved issues, not the raw issues
`unresolved_issues`: tests with `result: issue` that are NOT a verified gap resolution (#4983) — same criterion `phase uat-passed` uses (`src/uat-predicate.cts`).
A `result: issue` test is a verified resolution only when its `## Gaps` entry (matched by `test:`) has ALL of:
`status: resolved` (case-insensitive);
a non-empty `resolved_by`;
If a test has more than one `## Gaps` entry (a later regression re-opens the same test number with a fresh `gap_id`, per § 1), it only counts as resolved when EVERY entry for that test number is a verified resolution — one open regression is enough to keep the test unresolved.
<!-- vpmodule:atom:end count-the-unresolved-issues-not-the-raw-issues -->
<!-- vpmodule:atom:begin inject-a-cold-start-smoke-test-when-the-entry-paths-changed -->
---
instruction_id: inject-a-cold-start-smoke-test-when-the-entry-paths-changed
title: Inject a cold-start smoke test when the entry paths changed
summary: "When the work touched a start-up, database, seed or container path, a test that starts everything from scratch is put at the front of the list."
capability_tags:
  - verify-work-results
pattern_tags:
  - failure-first-analysis
conditions_applies_when: The finished work changed how the application starts or seeds itself.
conditions_does_not_apply_when: "None of the start-up, storage or container paths were touched."
artifact_contract_output_type: smoke-test-checkpoint
artifact_contract_required_data:
  - the paths that were touched
  - the cold-start checkpoint
artifact_contract_verified_by: the cold-start checkpoint is present and first in the list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Inject a cold-start smoke test when the entry paths changed
After extracting tests from SUMMARYs, scan the SUMMARY files for modified/created file paths. If ANY path matches these patterns:
Then **prepend** this test to the test list:
This catches bugs that only manifest on fresh start — race conditions in startup sequences, silent seed failures, missing environment setup — which pass against warm state but break in production.
<!-- vpmodule:atom:end inject-a-cold-start-smoke-test-when-the-entry-paths-changed -->
<!-- vpmodule:atom:begin keep-a-deferred-item-out-of-the-defect-list -->
---
instruction_id: keep-a-deferred-item-out-of-the-defect-list
title: Keep a deferred item out of the defect list
summary: An item the person defers to a later time is recorded as a deferred follow-up; it never becomes a defect of the current piece of work and never spawns a fix.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A person postpones an observation instead of reporting it as a problem.
conditions_does_not_apply_when: The observation is a defect of the work that was just done.
artifact_contract_output_type: deferred-follow-up
artifact_contract_required_data:
  - the deferred item
  - the test it belongs to
  - the date it was deferred at
artifact_contract_verified_by: the deferred item is recorded on its own list and never entered the defect list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep a deferred item out of the defect list
These are future-work ideas, not code issues for the current phase. Capture them WITHOUT creating a gap plan (#1921 — a deferred follow-up must never become a blocking gap or spawn a fix plan):
Do NOT append to `## Gaps` — deferred follow-ups are not blocking gaps. Continue to the next test.
<!-- vpmodule:atom:end keep-a-deferred-item-out-of-the-defect-list -->
<!-- vpmodule:atom:begin never-drop-a-deliverable-when-a-coverage-block-is-broken -->
---
instruction_id: never-drop-a-deliverable-when-a-coverage-block-is-broken
title: Never drop a deliverable when a coverage block is broken
summary: "A coverage record that cannot be read is reported and its entries still become checkpoints; an entirely covered set produces one confirmation, never an empty list."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A coverage record of the finished work is read and it may be malformed.
conditions_does_not_apply_when: The coverage record is complete and readable.
artifact_contract_output_type: coverage-checkpoints
artifact_contract_required_data:
  - the automatically covered deliverables
  - the human checkpoints
  - the errors found in the record
artifact_contract_verified_by: no deliverable was dropped and the automatically covered ones were listed instead of silently skipped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never drop a deliverable when a coverage block is broken
Surface any `errors[]` to the user (malformed coverage block) but still treat their entries as human checkpoints — **never drop a deliverable** (fail-safe).
If `all_auto_covered` is `true` (every entry auto-passed, including the `coverage: []` case) → do NOT generate zero checkpoints; present a **single confirmation summary** listing the auto-covered deliverables with their covering tests and ask the user to confirm.
Each `auto_passed[]` entry is recorded in UAT.md as `result: pass`, `source: automated` (see `create_uat_file`) — **do not present it as a checkpoint.**
<!-- vpmodule:atom:end never-drop-a-deliverable-when-a-coverage-block-is-broken -->