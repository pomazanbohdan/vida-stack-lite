---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-md-9a512c31-c03"
title: "gsd-core: gsd-core/workflows/execute-phase.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/workflows/execute-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase.md\"}"
atom_ids:
  - spot-check-the-delegated-claims-before-you-report-completion
  - treat-a-timeout-as-inconclusive-not-as-a-pass
  - verify-the-merge-not-only-the-pieces
  - wait-for-the-quota-reset-instead-of-retrying
  - write-the-summary-and-commit-it-before-you-narrate
atom_count: 5
atoms: "[{\"atom_id\":\"spot-check-the-delegated-claims-before-you-report-completion\",\"file_sha256\":\"8946f73db4c11b800328244b15fa2665cd630ae00765402a7d52d68ac7d1d1cd\",\"content_sha256\":\"bf196f5ebeb00442b1452656552a633be341defbeb19fa87bfda60d243242b66\",\"file_bytes\":1436,\"body_bytes\":298},{\"atom_id\":\"treat-a-timeout-as-inconclusive-not-as-a-pass\",\"file_sha256\":\"d84beac94a3efbe4d3b73c61f77d35dce20a4624431095518dfaa16bcb31c22c\",\"content_sha256\":\"486ccfc9bf2e3d819c341d8f01193ee5e24e2dbbbffc49597e3a3e48fd644d44\",\"file_bytes\":1415,\"body_bytes\":418},{\"atom_id\":\"verify-the-merge-not-only-the-pieces\",\"file_sha256\":\"6bec82c476f7f37870861c873b837136819dfb86c0a93e5b4f86197761c33dad\",\"content_sha256\":\"47732ebeeebbeb04f09ca37ce5c632eb151813a39971439bd840aceaa4601657\",\"file_bytes\":1756,\"body_bytes\":721},{\"atom_id\":\"wait-for-the-quota-reset-instead-of-retrying\",\"file_sha256\":\"9b9e1868a252349bccd58d76e02896549f6ee2877ccac682c93a5296a1824de6\",\"content_sha256\":\"664e508831ce5c155419ca604101f0589474aa3e3cd81c9fb39e32839ff6d3aa\",\"file_bytes\":1334,\"body_bytes\":263},{\"atom_id\":\"write-the-summary-and-commit-it-before-you-narrate\",\"file_sha256\":\"0d7173e4cf58dabdaa96d9ff7fe5f8a81899f5c4423cda213df00c9db88c11b2\",\"content_sha256\":\"fa91d1a4d2ac3601ce0c08ca4903ecda9b582a630277b7f1d798d53c20e16591\",\"file_bytes\":1123,\"body_bytes\":160}]"
carrier_sha256: fc7c04bb8c92a0c44e4830f62e32468f1e1aaf07cbe325fd28dbe84a66f50ddc
carrier_bytes: 7823
revision: 1
status: active
---
<!-- vpmodule:atom:begin spot-check-the-delegated-claims-before-you-report-completion -->
---
instruction_id: spot-check-the-delegated-claims-before-you-report-completion
title: Spot-check the delegated claims before you report completion
summary: "The files, the commits and the self-check marker of a delegated agent are checked before the round is reported."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A delegated agent reported that its work is done.
conditions_does_not_apply_when: The work was done in the current session.
artifact_contract_output_type: spot-check-report
artifact_contract_required_data:
  - the files checked
  - the commits checked
  - the self-check marker
artifact_contract_verified_by: "the files exist, the commits are on the current branch and no failure marker is present"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Spot-check the delegated claims before you report completion
Verify first 2 files from `key-files.created` exist on disk
Check for `## Self-Check: FAILED` marker
If ANY spot-check fails: report which plan failed, route to failure handler — ask "Retry plan?" or "Continue with remaining waves?"
<!-- vpmodule:atom:end spot-check-the-delegated-claims-before-you-report-completion -->
<!-- vpmodule:atom:begin treat-a-timeout-as-inconclusive-not-as-a-pass -->
---
instruction_id: treat-a-timeout-as-inconclusive-not-as-a-pass
title: "Treat a timeout as inconclusive, not as a pass"
summary: A check that timed out does not mark the work as complete.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check finished by timing out instead of returning a result.
conditions_does_not_apply_when: The check returned a result.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the exit state
  - what stayed unproven
artifact_contract_verified_by: the timed-out check did not mark the work as complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat a timeout as inconclusive, not as a pass
Only update tracking when tests passed
If tests failed or timed out, skip the tracking update — plans should not be marked as complete when integration tests are failing or inconclusive.
Timeout (124) is treated as inconclusive — do NOT mark plans complete
Skipping tracking update — test suite timed out. Plans remain in-progress. Run tests manually to confirm.
<!-- vpmodule:atom:end treat-a-timeout-as-inconclusive-not-as-a-pass -->
<!-- vpmodule:atom:begin verify-the-merge-not-only-the-pieces -->
---
instruction_id: verify-the-merge-not-only-the-pieces
title: "Verify the merge, not only the pieces"
summary: "The build and the test suite run on the merged result, not only inside each separate piece."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The separate pieces of a round have been brought together.
conditions_does_not_apply_when: Only one piece was produced.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the build result
  - the test result
artifact_contract_verified_by: the build and the test suite ran on the merged result and not only inside each piece
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Verify the merge, not only the pieces
After merging all worktrees in a wave (parallel mode), or after the last plan completes (serial mode), run a build and then the project's test suite to catch cross-plan integration issues that individual worktree self-checks cannot detect (e.g., conflicting type definitions, removed exports, import changes, link errors).
agents reliably report Self-Check: PASSED even when merging their work creates failures.
Worktree isolation means each agent's Self-Check passes in isolation. But when merged, add/add conflicts in shared files (models, registries, CLI entry points) can silently drop code. The post-merge gate catches this before the next wave builds on a broken foundation.
<!-- vpmodule:atom:end verify-the-merge-not-only-the-pieces -->
<!-- vpmodule:atom:begin wait-for-the-quota-reset-instead-of-retrying -->
---
instruction_id: wait-for-the-quota-reset-instead-of-retrying
title: Wait for the quota reset instead of retrying
summary: "A quota failure is answered by waiting for the reset, not by retrying into the same limit."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A delegated agent failed because a provider quota or rate limit was hit.
conditions_does_not_apply_when: The agent failed for a reason the run can fix itself.
artifact_contract_output_type: failure-report
artifact_contract_required_data:
  - the sentinel that was found
  - the recovery action
artifact_contract_verified_by: the run waited for the reset instead of retrying into the same limit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Wait for the quota reset instead of retrying
Agent return body contains a sentinel like `usage limit`, `rate limit`, `429`, `too many requests`, `RESOURCE_EXHAUSTED`, `usage_limit_reached`.
Do not offer retry-now; the right action is wait-for-reset and resume.
<!-- vpmodule:atom:end wait-for-the-quota-reset-instead-of-retrying -->
<!-- vpmodule:atom:begin write-the-summary-and-commit-it-before-you-narrate -->
---
instruction_id: write-the-summary-and-commit-it-before-you-narrate
title: Write the summary and commit it before you narrate
summary: The summary is committed before the agent says anything about it.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - completion-criteria
conditions_applies_when: A delegated agent has produced the summary of its work.
conditions_does_not_apply_when: The agent produced no summary.
artifact_contract_output_type: commit
artifact_contract_required_data:
  - the summary
  - the commit
artifact_contract_verified_by: the summary was committed before the agent said anything about it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write the summary and commit it before you narrate
REQUIRED ORDER: Write the summary
→ commit → only then any narration.
Do NOT skip or defer this commit
<!-- vpmodule:atom:end write-the-summary-and-commit-it-before-you-narrate -->