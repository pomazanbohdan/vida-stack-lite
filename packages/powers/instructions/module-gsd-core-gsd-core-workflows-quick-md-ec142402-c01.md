---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-quick-md-ec142402-c01"
title: "gsd-core: gsd-core/workflows/quick.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/quick.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/quick.md\"}"
atom_ids:
  - authorize-scope-only-from-a-live-observation
  - report-a-denied-write-do-not-work-around-it
  - scope-a-review-to-the-commits-that-belong-to-the-task
  - stop-the-unit-and-leave-the-state-alone-when-a-guard-aborts
atom_count: 4
atoms: "[{\"atom_id\":\"authorize-scope-only-from-a-live-observation\",\"file_sha256\":\"a18196bd14affc27cc54951004704172304452e69e0d81814e2d40c941999acc\",\"content_sha256\":\"f8750b2a1d047316db367cdffbc7b8f04de8ccd709d2dc235c6736789fbabf22\",\"file_bytes\":1635,\"body_bytes\":373},{\"atom_id\":\"report-a-denied-write-do-not-work-around-it\",\"file_sha256\":\"b038771f83b0cf36b314feee8605d74780ad453bb0d4d1d7ad74c1c44e191cbe\",\"content_sha256\":\"57d3152c084179323c9f9cbba5e2703fe128079053887d227efb9859691b7b83\",\"file_bytes\":1238,\"body_bytes\":162},{\"atom_id\":\"scope-a-review-to-the-commits-that-belong-to-the-task\",\"file_sha256\":\"71c54be3f99890da660337dd5643fdb28887da643cc5cf78dbf2d8e424aff593\",\"content_sha256\":\"d2f1661b3815a3269092957634fbf973ee403509e21175dbb29f76aa2cea2024\",\"file_bytes\":1520,\"body_bytes\":289},{\"atom_id\":\"stop-the-unit-and-leave-the-state-alone-when-a-guard-aborts\",\"file_sha256\":\"98397ca12a6d7b98cb07b00e1b7fd8e24de0f3c12f8803daf37f2ea5a4b755a1\",\"content_sha256\":\"44d737d5cb8b42fe1e55bbe4007d4ba3632fc6dc79461d1577413115c687db44\",\"file_bytes\":1390,\"body_bytes\":214}]"
carrier_sha256: 0fad86535882866e70def8157a427261d323b447a3caee3df20a02b44a7c9a3b
carrier_bytes: 6412
revision: 1
status: active
---
<!-- vpmodule:atom:begin authorize-scope-only-from-a-live-observation -->
---
instruction_id: authorize-scope-only-from-a-live-observation
title: Authorize scope only from a live observation
summary: "When the edit or verification scope depends on mutable state, it is authorized only by an observation made at planning time; historical notes may guide the search but never authorize a file."
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: A plan names the files it will edit or verify and the state behind that scope can change.
conditions_does_not_apply_when: The scope is a fixed list that cannot change between planning and execution.
artifact_contract_output_type: scope-authority
artifact_contract_required_data:
  - the live observation
  - the authorized scope
  - the condition when the scope is conditional
artifact_contract_verified_by: every authorized file comes from an observation made now and no historical path is listed as authorized
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Authorize scope only from a live observation
when concrete edit or verification scope depends on mutable external state
authorize scope ONLY from a live observation made at planning time
or keep `files`/`verify` CONDITIONAL on that observation
may guide investigation only; they are never edit or verification authority
a plan must not enumerate them as authorized files
<!-- vpmodule:atom:end authorize-scope-only-from-a-live-observation -->
<!-- vpmodule:atom:begin report-a-denied-write-do-not-work-around-it -->
---
instruction_id: report-a-denied-write-do-not-work-around-it
title: "Report a denied write, do not work around it"
summary: A write that a guard denies is reported in the final message; the same effect is not reached by copying or moving the file with a shell command.
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A write is refused by a path or permission guard.
conditions_does_not_apply_when: The write was refused because the input was wrong.
artifact_contract_output_type: denial-report
artifact_contract_required_data:
  - the denial
  - the file that was refused
artifact_contract_verified_by: the denial is in the report and no shell copy or move was used to get around it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report a denied write, do not work around it
stop and report the denial in your final message — do not work around it by copying or moving the file
with Bash
<!-- vpmodule:atom:end report-a-denied-write-do-not-work-around-it -->
<!-- vpmodule:atom:begin scope-a-review-to-the-commits-that-belong-to-the-task -->
---
instruction_id: scope-a-review-to-the-commits-that-belong-to-the-task
title: Scope a review to the commits that belong to the task
summary: "The files under review are the union of the commits that name the task on this branch, with the planning artifacts and the lockfiles excluded; a commit range would fold in the unrelated work interleaved in the same window."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is scoped to the work a single task produced.
conditions_does_not_apply_when: The review covers the whole branch or the whole repository.
artifact_contract_output_type: review-scope
artifact_contract_required_data:
  - the commits that belong to the task
  - the excluded paths
  - the resulting file list
artifact_contract_verified_by: the scope is the union of the task commits and no unrelated commit is inside it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Scope a review to the commits that belong to the task
UNION of the commits naming the quick task id, on THIS branch only
lockfiles excluded
still folds in every unrelated
commit interleaved inside the task's window
the union cannot
No commits for this task => empty scope => skip review
<!-- vpmodule:atom:end scope-a-review-to-the-commits-that-belong-to-the-task -->
<!-- vpmodule:atom:begin stop-the-unit-and-leave-the-state-alone-when-a-guard-aborts -->
---
instruction_id: stop-the-unit-and-leave-the-state-alone-when-a-guard-aborts
title: Stop the unit and leave the state alone when a guard aborts
summary: "When a guard aborts the operation, the commit is not attempted, the staged files are not cleared, the following steps are not run, and the abort message is carried in the report."
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A guard refuses the operation the unit was about to perform.
conditions_does_not_apply_when: The operation failed for a reason the guard did not detect.
artifact_contract_output_type: guard-abort
artifact_contract_required_data:
  - the abort message
  - the state that was left untouched
artifact_contract_verified_by: the staged files are still there and no later step of the unit ran
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stop the unit and leave the state alone when a guard aborts
If the guard aborts, do NOT attempt the commit, do NOT remove the staged files, and do NOT continue subsequent tasks
Surface the abort message
and stop
<!-- vpmodule:atom:end stop-the-unit-and-leave-the-state-alone-when-a-guard-aborts -->