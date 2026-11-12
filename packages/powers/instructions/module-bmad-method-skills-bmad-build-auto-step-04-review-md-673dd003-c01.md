---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-step-04-review-md-673dd003-c01"
title: "bmad-method: skills/bmad-build-auto/step-04-review.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-build-auto/step-04-review.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/step-04-review.md\"}"
atom_ids:
  - append-deferred-items-to-one-list-and-re-parse-it
  - cap-the-review-repair-loop
  - carry-forward-a-finding-that-was-already-triaged
  - extract-keep-instructions-before-re-deriving
  - group-findings-by-shared-root-cause
  - launch-every-review-lane-before-reading-any-result
  - leave-the-working-copy-clean-after-the-run
  - pass-the-diff-by-path-not-by-paste
atom_count: 8
atoms: "[{\"atom_id\":\"append-deferred-items-to-one-list-and-re-parse-it\",\"file_sha256\":\"6b9f7224a9d8bf6a9b95896d477cfa94798bb33c309be6209e94686ae66bee3b\",\"content_sha256\":\"a273c2c57ef2211182f03c8127c7ce9a449d6ffeb8012cf8039597f93de33b0f\",\"file_bytes\":1827,\"body_bytes\":711},{\"atom_id\":\"cap-the-review-repair-loop\",\"file_sha256\":\"a9d3b99e56789733ef628e45da19294e312cabf1e370150ffbdab3db10ac2567\",\"content_sha256\":\"0d2e758e9e1777a4f92b38cd2592ec22ea0b0d3f1a1311e38990deaaf549a1e1\",\"file_bytes\":3239,\"body_bytes\":1811},{\"atom_id\":\"carry-forward-a-finding-that-was-already-triaged\",\"file_sha256\":\"e2042acf73407fe62d966eb7a5fb02a62d2a9df20ac9bdb6c9309059c6b924a7\",\"content_sha256\":\"377db68d8991fc2c6d68bd6a7335b7993d5d95ef3a73c385f508dc407f38a6d3\",\"file_bytes\":1819,\"body_bytes\":512},{\"atom_id\":\"extract-keep-instructions-before-re-deriving\",\"file_sha256\":\"7fa4521c52d13cd2cafcda8f33a38e3de46732619a31dfddd0b3e87101f831fb\",\"content_sha256\":\"cf421a02b0c8229e67864c6dc058f422c1d06e5a489f0d90889a7ab5cc9fc59e\",\"file_bytes\":1520,\"body_bytes\":369},{\"atom_id\":\"group-findings-by-shared-root-cause\",\"file_sha256\":\"c6e179812f9f14d9e0a4b183b93285fa964013caedf96a25ce362f9dde8e3a31\",\"content_sha256\":\"a737b979d07370ae1152c72474342345a89b96b5b385e003ba881764362ca10d\",\"file_bytes\":2170,\"body_bytes\":946},{\"atom_id\":\"launch-every-review-lane-before-reading-any-result\",\"file_sha256\":\"27802603662af94585d11b54e189023cffd2fc2a33a5448e97b3c55b35ffe2aa\",\"content_sha256\":\"362838d3c52e49396a194e2de564c2476ea7cb0badce3350354bb4599251b8b3\",\"file_bytes\":1380,\"body_bytes\":286},{\"atom_id\":\"leave-the-working-copy-clean-after-the-run\",\"file_sha256\":\"221dc87d2a29fe5981a72f167754f6194eee4e4b277d74881db0138772afdb7a\",\"content_sha256\":\"9db19cf1857a9a74b84ddcc2ba0929c59988428737c049091986035c3141f7aa\",\"file_bytes\":1400,\"body_bytes\":297},{\"atom_id\":\"pass-the-diff-by-path-not-by-paste\",\"file_sha256\":\"b6bf477cd6fff103604c8e5947df26bd0f844847c5487b22f27469c43ef9bbb2\",\"content_sha256\":\"282eb4860820721cce24d92282353af9bf3887f6a0cc24a881b91ea43e5e1ef4\",\"file_bytes\":1283,\"body_bytes\":286}]"
carrier_sha256: ce770417b5a1686726c273d34a00cec0775be2fee3e34fefdcfe025b8e5dbd7e
carrier_bytes: 15757
revision: 1
status: active
---
<!-- vpmodule:atom:begin append-deferred-items-to-one-list-and-re-parse-it -->
---
instruction_id: append-deferred-items-to-one-list-and-re-parse-it
title: Append deferred items to one list and re-parse it
summary: "Deferred items go into one list that is never duplicated, and the whole record is parsed again afterwards to prove the list survived the write."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A finding is deferred instead of fixed.
conditions_does_not_apply_when: No finding is deferred.
artifact_contract_output_type: deferred-list
artifact_contract_required_data:
  - the deferred items
  - the summary
  - the evidence
  - the optional location
  - the optional severity
artifact_contract_verified_by: the record parses and holds one list with every prior item and the new ones
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Append deferred items to one list and re-parse it
Preserve every existing item, do not look for duplicates, and never add a second `deferred:` key.
If the field is absent (including on plans created before this field existed), add it once as an empty list.
If it is `deferred: []`, replace that empty value when adding the first item; otherwise append to the existing list.
Serialize free-form values as YAML block scalars so characters such as `:`, `#`, quotes, and line breaks remain data.
After all appends, parse the complete frontmatter as YAML and verify that `deferred` is one list containing every prior item plus the new items with their intended text.
Repair serialization errors before continuing.
<!-- vpmodule:atom:end append-deferred-items-to-one-list-and-re-parse-it -->
<!-- vpmodule:atom:begin cap-the-review-repair-loop -->
---
instruction_id: cap-the-review-repair-loop
title: Cap the review repair loop
summary: The repair loop counts its iterations and stops at the cap instead of grinding; a run that does not converge is reported as blocked.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A review finding sends the work back into the plan.
conditions_does_not_apply_when: The review produced no finding that sends the work back.
artifact_contract_output_type: repair-loop-record
artifact_contract_required_data:
  - the iteration count
  - the cap
  - the pass that was recorded when the cap was reached
artifact_contract_verified_by: the loop stopped at the cap and the pass was recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ui-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/gates.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Cap the review repair loop
Before each plan-defect loopback, read the review loop counter from the plan frontmatter (missing means `0`), increment it by 1, and write it back.
If it exceeds 5, append the triage-log entry for this pass, then HALT with status `blocked` and blocking condition `review repair loop exceeded 5 iterations (non-convergence)`.
Max revision iterations reached. Remaining issues:
If the researcher returns `## REVISION_CONFLICT`: do NOT increment `revision_count` and do NOT re-spawn the checker — a conflict is not resolvable by re-running the same loop.
Present the conflict and its alternatives to the user and ask which to take: adopt a named alternative / override the named constraint and apply the hint / amend the constraint itself.
Every option resolves the conflict — accepting the spec with the BLOCK still open is NOT offered here, because the blocking `required_property` still fails; that choice belongs to the cap escalation below.
a conflict naming the SAME `required_property` twice in a row (no successful revision in between) is a stall, and so is the THIRD conflict return of this loop whatever property it names
Stop re-spawning and route it to the same cap escalation below, so declining to spend an iteration cannot make this path unbounded.
`required_property` + evidence + severity BIND. `fix_hint` is ONE non-binding example route: a smaller or different mechanism reaching the same property resolves the issue in full — say which you used.
Do NOT replan from scratch unless issues are fundamental.
The cap should reflect the cost of each iteration -- expensive operations get fewer retries.
The loop also escalates early if issue count does not decrease between consecutive iterations (stall detection).
After max iterations, escalates unconditionally.
<!-- vpmodule:atom:end cap-the-review-repair-loop -->
<!-- vpmodule:atom:begin carry-forward-a-finding-that-was-already-triaged -->
---
instruction_id: carry-forward-a-finding-that-was-already-triaged
title: Carry forward a finding that was already triaged
summary: A finding that a logged row already covers keeps its verdict and its route; it is not verified again and never patched or deferred twice.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: The review runs again over a change that was already reviewed.
conditions_does_not_apply_when: This is the first review pass over the change.
artifact_contract_output_type: carried-finding
artifact_contract_required_data:
  - the carried row
  - the verdict and route it kept
  - the evidence that shows the code still reads the same
artifact_contract_verified_by: the carried row was kept and nothing was patched or deferred for it again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/complete-milestone/detail/elaboration.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Carry forward a finding that was already triaged
Same location and same claim as a logged row, and the code there still reads as the row describes: keep the row's verdict and route, write the row again with `carried` in front of the evidence, skip verification, and never patch or defer it again.
Acknowledging is verdict-preserving and self-invalidating: it never rewrites the artifact own status field, and the suppression it grants lapses automatically the moment the artifact observed state changes again.
<!-- vpmodule:atom:end carry-forward-a-finding-that-was-already-triaged -->
<!-- vpmodule:atom:begin extract-keep-instructions-before-re-deriving -->
---
instruction_id: extract-keep-instructions-before-re-deriving
title: Extract keep instructions before re-deriving
summary: "What worked in the rejected attempt is extracted as keep instructions before the code is derived again, and the logged constraints are respected."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: The work is re-derived after the plan was amended.
conditions_does_not_apply_when: The work is not being re-derived.
artifact_contract_output_type: keep-instructions
artifact_contract_required_data:
  - the keep instructions
  - the logged constraints that were respected
  - the amendment entry
artifact_contract_verified_by: the keep instructions were extracted before the revert and carried into the next derivation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Extract keep instructions before re-deriving
Before reverting code: extract KEEP instructions for positive preservation (what worked well and must survive re-derivation).
Revert code changes.
Read the `## Plan Change Log` in `{plan_file}` and strictly respect all logged constraints when amending the sections outside `<intent-contract>` that contain the root cause.
<!-- vpmodule:atom:end extract-keep-instructions-before-re-deriving -->
<!-- vpmodule:atom:begin group-findings-by-shared-root-cause -->
---
instruction_id: group-findings-by-shared-root-cause
title: Group findings by shared root cause
summary: "Normalize raw findings as R ids, then group the survivors into F findings only when the same root cause produced both; the same location or the same fix is not enough."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Several findings survived verification and have to be grouped.
conditions_does_not_apply_when: Only one finding survived.
artifact_contract_output_type: finding-groups
artifact_contract_required_data:
  - the groups
  - the verified bad outcome of each group
  - the members of each group
artifact_contract_verified_by: no group holds two findings with different root causes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-03-triage.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Group findings by shared root cause
Normalize every reported finding first, without deduplicating: give each a raw `R<n>` id, its source lens, title, detail and location, and write it to `{triage_file}`.
Group the findings that survived rejection by shared root cause — two raw findings belong in one entry only when the same root cause produced both.
Same location alone is not a shared root cause, and neither is a shared fix; there can be multiple defects on the same line.
An entry carries every member's verified bad outcome in `detail`, the highest verdict among them (Critical > Important > Minor > `maybe-false`), `source` set to the contributing lenses joined with `+` (e.g., `blind-hunter+edge-case-hunter`), and the raw `R` ids it is built from.
Order the groups highest verdict first and give each a finding id `F<n>`; a group of one is identical to its raw finding except for the id.
Append every `F` finding to `{triage_file}`.
<!-- vpmodule:atom:end group-findings-by-shared-root-cause -->
<!-- vpmodule:atom:begin launch-every-review-lane-before-reading-any-result -->
---
instruction_id: launch-every-review-lane-before-reading-any-result
title: Launch every review lane before reading any result
summary: "The skipped lanes are announced first, every lane is launched, and the collection of results starts only after all of them were launched."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several review lanes will examine the same change.
conditions_does_not_apply_when: Only one lane runs.
artifact_contract_output_type: review-launch-record
artifact_contract_required_data:
  - the lanes that were skipped
  - the lanes that were launched
  - the order they were launched in
artifact_contract_verified_by: every lane was launched before any result was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Launch every review lane before reading any result
Announce skipped lenses first, then launch every active lens before handling any lens's result.
Spawn every reviewer subagent before reading or reacting to any of their output; begin collection and triage only once all are launched.
<!-- vpmodule:atom:end launch-every-review-lane-before-reading-any-result -->
<!-- vpmodule:atom:begin leave-the-working-copy-clean-after-the-run -->
---
instruction_id: leave-the-working-copy-clean-after-the-run
title: Leave the working copy clean after the run
summary: "The files the run changed are committed, the commits of the run are kept, and the working copy is verified clean before the run ends."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: The run produced changes in a version-controlled working copy.
conditions_does_not_apply_when: Version control is unavailable.
artifact_contract_output_type: finalization-record
artifact_contract_required_data:
  - the committed files
  - the clean working copy
  - the blocking condition when it was not clean
artifact_contract_verified_by: the working copy was verified clean and nothing was pushed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Leave the working copy clean after the run
Commit any reviewed-diff files that remain uncommitted
Keep commits already created during this run.
Verify the version-controlled working copy is clean.
Otherwise HALT with status `blocked` and blocking condition `finalization left repository dirty`.
<!-- vpmodule:atom:end leave-the-working-copy-clean-after-the-run -->
<!-- vpmodule:atom:begin pass-the-diff-by-path-not-by-paste -->
---
instruction_id: pass-the-diff-by-path-not-by-paste
title: "Pass the diff by path, not by paste"
summary: The review lanes read the staged diff from its path; the diff text is never pasted into a review prompt.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review lane is launched over a change.
conditions_does_not_apply_when: The review reads the change from the working copy directly.
artifact_contract_output_type: review-dispatch
artifact_contract_required_data:
  - the path of the staged diff
  - the lanes that read it
artifact_contract_verified_by: no prompt carried the diff text
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Pass the diff by path, not by paste
The review lenses read that file; the diff text is never pasted into their prompts.
Before launching a lens, expand its skill-root placeholder to this skill's absolute installed directory; never leave that placeholder unresolved in a child prompt.
<!-- vpmodule:atom:end pass-the-diff-by-path-not-by-paste -->