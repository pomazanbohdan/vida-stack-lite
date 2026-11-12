---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-code-fixer-compact-md-8f6d4e62-c01"
title: "gsd-core: agents/gsd-code-fixer.compact.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:agents/gsd-code-fixer.compact.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-code-fixer.compact.md\"}"
atom_ids:
  - mark-a-logic-fix-as-needing-human-verification
  - read-the-source-before-you-apply-the-review-suggestion
  - roll-back-only-the-finding-that-failed-verification
  - scope-each-fix-to-the-files-it-touches
atom_count: 4
atoms: "[{\"atom_id\":\"mark-a-logic-fix-as-needing-human-verification\",\"file_sha256\":\"1e442e8a74e16333ff94d52a95d42d588a4f1beac82d82891bf6c7741b7ef91b\",\"content_sha256\":\"bf239efcc309cc5cb20a68837332279f410fa7cd24b1f8d87f3a33731d31574f\",\"file_bytes\":1552,\"body_bytes\":351},{\"atom_id\":\"read-the-source-before-you-apply-the-review-suggestion\",\"file_sha256\":\"15dac642af5ff4a37ed6e6dfc74a2b32f892ee11e6eedc9bd32874a6fed60fa4\",\"content_sha256\":\"c809580ce331a5a64d8e7063a943e311f4cc59256560a6f61da99ba1a7569cb2\",\"file_bytes\":1622,\"body_bytes\":387},{\"atom_id\":\"roll-back-only-the-finding-that-failed-verification\",\"file_sha256\":\"35bb8e5a8eb284e3da3a9f6d906bc344d8ed5b44c1720799806f94a8e54bf9c7\",\"content_sha256\":\"a9017af6cd7ff7facdedde4f9b9815943d62bd06aebaee1be773b938ad168553\",\"file_bytes\":1533,\"body_bytes\":331},{\"atom_id\":\"scope-each-fix-to-the-files-it-touches\",\"file_sha256\":\"447d7dae538ce1c3e9e2f7c6c1fd9d62f6fa84ffca66448f2cb49bc975d01a8d\",\"content_sha256\":\"87aac54d100ed462b5ed949faffdf9146ead591f664904163b17b2186ff94ed8\",\"file_bytes\":1346,\"body_bytes\":318}]"
carrier_sha256: b188d7a460aae45e90dfa98e6f813f7610ecd38b1534673232bc5f45d409527d
carrier_bytes: 6662
revision: 1
status: active
---
<!-- vpmodule:atom:begin mark-a-logic-fix-as-needing-human-verification -->
---
instruction_id: mark-a-logic-fix-as-needing-human-verification
title: Mark a logic fix as needing human verification
summary: A change that only passes the syntax check is not a verified fix; a logic change is reported as needing a human to confirm it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A fix changes logic rather than only structure.
conditions_does_not_apply_when: The fix is a formatting or import change with no behavioural effect.
artifact_contract_output_type: fix-record
artifact_contract_required_data:
  - the verification level reached
  - the need for a human check
artifact_contract_verified_by: a logic fix is reported as requiring human verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mark a logic fix as needing human verification
Tier 1 and Tier 2 only verify syntax/structure, NOT semantic correctness.
A fix that introduces a wrong condition, off-by-one, or incorrect logic will pass both tiers and get committed.
This flags it for the developer to manually confirm the logic is correct before the phase proceeds to verification.
<!-- vpmodule:atom:end mark-a-logic-fix-as-needing-human-verification -->
<!-- vpmodule:atom:begin read-the-source-before-you-apply-the-review-suggestion -->
---
instruction_id: read-the-source-before-you-apply-the-review-suggestion
title: Read the source before you apply the review suggestion
summary: "The reported issue is re-read in the current file before the change is made, and the change is adapted to the code that is actually there."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A reported defect is about to be fixed.
conditions_does_not_apply_when: The change is a mechanical rename that the file states directly.
artifact_contract_output_type: fix-record
artifact_contract_required_data:
  - the file read
  - the line read around
  - the adaptation
artifact_contract_verified_by: the file was read before the edit and the finding was skipped when the context no longer matched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read the source before you apply the review suggestion
Read the actual source file at the cited line (plus surrounding context — at least +/- 10 lines)
Understand the current code state — check if code matches what reviewer saw
Adapt the fix suggestion to the actual code if it has changed or differs from review context
Mark finding as "skipped: code context differs from review"
<!-- vpmodule:atom:end read-the-source-before-you-apply-the-review-suggestion -->
<!-- vpmodule:atom:begin roll-back-only-the-finding-that-failed-verification -->
---
instruction_id: roll-back-only-the-finding-that-failed-verification
title: Roll back only the finding that failed verification
summary: "The files a single finding touches are recorded before the edit, and a failed verification reverts exactly those files and nothing earlier."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A fix was applied and its verification failed.
conditions_does_not_apply_when: The fix passed verification and was committed.
artifact_contract_output_type: fix-record
artifact_contract_required_data:
  - the files touched
  - the rollback result
artifact_contract_verified_by: the failed change was reverted and the earlier findings were left untouched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Roll back only the finding that failed verification
Record files to touch: Note each file path in `touched_files` before editing anything.
Re-read the file and confirm it matches pre-fix state.
Mark finding as "skipped: fix caused errors, rolled back".
Rollback for finding N does NOT affect commits from findings 1 through N-1.
<!-- vpmodule:atom:end roll-back-only-the-finding-that-failed-verification -->
<!-- vpmodule:atom:begin scope-each-fix-to-the-files-it-touches -->
---
instruction_id: scope-each-fix-to-the-files-it-touches
title: Scope each fix to the files it touches
summary: Only the files the finding names are changed; a new file appears only when the fix requires one.
capability_tags:
  - minimize-code-surface
pattern_tags:
  - scope-routing
conditions_applies_when: A finding is fixed.
conditions_does_not_apply_when: The finding explicitly asks for a new file.
artifact_contract_output_type: fix-record
artifact_contract_required_data:
  - the files changed
artifact_contract_verified_by: no file outside the finding was modified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-code-fixer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Scope each fix to the files it touches
DO NOT modify files unrelated to the finding — scope each fix narrowly to the issue at hand.
DO NOT create new files unless the fix explicitly requires it (e.g., missing import file, missing test file that reviewer suggested).
Collect ALL file paths mentioned in the finding
<!-- vpmodule:atom:end scope-each-fix-to-the-files-it-touches -->