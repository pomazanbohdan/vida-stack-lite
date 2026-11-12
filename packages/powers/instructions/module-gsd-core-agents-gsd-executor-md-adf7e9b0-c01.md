---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-agents-gsd-executor-md-adf7e9b0-c01"
title: "gsd-core: agents/gsd-executor.md module"
summary: "Carrier for 7 atomic instructions from gsd-core:agents/gsd-executor.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"agents/gsd-executor.md\"}"
atom_ids:
  - fix-only-what-the-current-change-broke
  - record-the-stub-you-left-behind-instead-of-reporting-the-phase-as-complete
  - report-the-new-security-surface-you-introduced
  - stop-after-three-auto-fix-attempts-on-one-task
  - stop-reading-and-write-something-or-report-yourself-blocked
  - treat-an-authentication-error-as-a-gate-not-a-failure
  - verify-the-claims-you-wrote-in-the-summary-before-you-report-done
atom_count: 7
atoms: "[{\"atom_id\":\"fix-only-what-the-current-change-broke\",\"file_sha256\":\"cba69725f2806f789edca6108fafca40fa63e1776fa05f89bfe4f6de982aa1b7\",\"content_sha256\":\"de341aff820d1f2e2fcdc02363762ffc79c3cafa21d3197a9a0d143e5c782167\",\"file_bytes\":1340,\"body_bytes\":340},{\"atom_id\":\"record-the-stub-you-left-behind-instead-of-reporting-the-phase-as-complete\",\"file_sha256\":\"16ffd611e6e5c5b4e3a5527d99b468771385a6b3e69c00408f0f14ab6ee3d4ac\",\"content_sha256\":\"989db290b67c5dffebb68d383909709e496d74cc0aaff983a83779dced521624\",\"file_bytes\":1511,\"body_bytes\":367},{\"atom_id\":\"report-the-new-security-surface-you-introduced\",\"file_sha256\":\"b597c810e46ee7867a07e0403d79bc1949e56f436ba5133fa3757ea48aeb66bf\",\"content_sha256\":\"569b6b80589ae16aac902251a8835ee2bcdf0c875f65080ff87b5b0bf6b4ec59\",\"file_bytes\":1299,\"body_bytes\":315},{\"atom_id\":\"stop-after-three-auto-fix-attempts-on-one-task\",\"file_sha256\":\"d92330862da1c0e7d5efc4fd00c1eb904c490995c7b2fe6f974fcf3cbbaeea91\",\"content_sha256\":\"ac3f2136aa4a7b44eb6a9de41ebca778b6efd45d6d8de2d153c9169b8885715d\",\"file_bytes\":1295,\"body_bytes\":312},{\"atom_id\":\"stop-reading-and-write-something-or-report-yourself-blocked\",\"file_sha256\":\"588a878a6e8893064fb38cd9547a0b8c833fec545c11582783c409ba0e3f093e\",\"content_sha256\":\"6d9d9acbfd903e29e15e0313aa917f9efe92b7de98595e51d17f245c6433b5e6\",\"file_bytes\":1507,\"body_bytes\":414},{\"atom_id\":\"treat-an-authentication-error-as-a-gate-not-a-failure\",\"file_sha256\":\"2b4a0e00808f05a12d13b141053b530312f15c5e894e49894b97b5f4b53ed97d\",\"content_sha256\":\"b2ec2013c8ea0e569a9c91054318e3a9de314f33e881bdf09865a91d68a51627\",\"file_bytes\":1397,\"body_bytes\":294},{\"atom_id\":\"verify-the-claims-you-wrote-in-the-summary-before-you-report-done\",\"file_sha256\":\"e7ec56567686a2b28c4bc007989ef62d22feea94a6e8e499f3166173fa46e9cc\",\"content_sha256\":\"6c1e3270f89cbf8aa25031c88c8077e224f51a4b21803a1cddc5c4a17a9a8093\",\"file_bytes\":1389,\"body_bytes\":348}]"
carrier_sha256: 2b26b752c1ed5f9c5941d7cca90af4a68bf5f705ed0a845ddfb4a52bbf12b80f
carrier_bytes: 10905
revision: 1
status: active
---
<!-- vpmodule:atom:begin fix-only-what-the-current-change-broke -->
---
instruction_id: fix-only-what-the-current-change-broke
title: Fix only what the current change broke
summary: A defect the current change caused is fixed; anything else is written down for later and left alone.
capability_tags:
  - execute-plan
pattern_tags:
  - scope-routing
conditions_applies_when: A defect is noticed while a task runs.
conditions_does_not_apply_when: The defect is a correctness or security requirement the change itself depends on.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the fixed defects
  - the deferred defects
artifact_contract_verified_by: no out-of-scope defect was fixed and each one was recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Fix only what the current change broke
Only auto-fix issues DIRECTLY caused by the current task's changes. Pre-existing warnings, linting errors, or failures in unrelated files are out of scope.
Log out-of-scope discoveries to `deferred-items.md` in the phase directory
Do NOT fix them
Do NOT re-run builds hoping they resolve themselves
<!-- vpmodule:atom:end fix-only-what-the-current-change-broke -->
<!-- vpmodule:atom:begin record-the-stub-you-left-behind-instead-of-reporting-the-phase-as-complete -->
---
instruction_id: record-the-stub-you-left-behind-instead-of-reporting-the-phase-as-complete
title: Record the stub you left behind instead of reporting the phase as complete
summary: "A placeholder that was left in place is written down with its file and its line, and the phase is not called complete while it blocks the goal."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: Work finished with a placeholder still in the code.
conditions_does_not_apply_when: No placeholder was left behind.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the stubs
  - their file and line
  - the reason
artifact_contract_verified_by: every stub is listed and the phase was not reported complete while a blocking stub remained
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Record the stub you left behind instead of reporting the phase as complete
If any stubs exist, add a `## Known Stubs` section to the SUMMARY listing each stub with its file, line, and reason.
Do NOT mark a plan as complete if stubs exist that prevent the plan's goal from being achieved
Components with no data source wired (props always receiving empty/mock data)
<!-- vpmodule:atom:end record-the-stub-you-left-behind-instead-of-reporting-the-phase-as-complete -->
<!-- vpmodule:atom:begin report-the-new-security-surface-you-introduced -->
---
instruction_id: report-the-new-security-surface-you-introduced
title: Report the new security surface you introduced
summary: "A change that opened an endpoint, an auth path or a trust boundary is reported even when the plan did not mention it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: The change added a surface the plan did not describe.
conditions_does_not_apply_when: The change opened no new surface.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the new surface
  - the file
artifact_contract_verified_by: every new surface outside the plan is listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Report the new security surface you introduced
Before writing the SUMMARY, check if any files created/modified introduce security-relevant surface NOT in the plan's `<threat_model>` — new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.
Omit section if nothing found.
<!-- vpmodule:atom:end report-the-new-security-surface-you-introduced -->
<!-- vpmodule:atom:begin stop-after-three-auto-fix-attempts-on-one-task -->
---
instruction_id: stop-after-three-auto-fix-attempts-on-one-task
title: Stop after three auto-fix attempts on one task
summary: "Three attempts and the task stops: what is left is written down and the run moves on instead of rebuilding."
capability_tags:
  - execute-plan
pattern_tags:
  - resource-bounds
conditions_applies_when: A task keeps failing and the agent keeps trying to fix it.
conditions_does_not_apply_when: The task passed.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the remaining issues
artifact_contract_verified_by: the task stopped at the bound and the remaining issues were documented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop after three auto-fix attempts on one task
Track auto-fix attempts per task. After 3 auto-fix attempts on a single task:
STOP fixing — document remaining issues in SUMMARY.md under "Deferred Issues"
Continue to the next task (or return checkpoint if blocked)
Do NOT restart the build to find more issues
<!-- vpmodule:atom:end stop-after-three-auto-fix-attempts-on-one-task -->
<!-- vpmodule:atom:begin stop-reading-and-write-something-or-report-yourself-blocked -->
---
instruction_id: stop-reading-and-write-something-or-report-yourself-blocked
title: "Stop reading and write something, or report yourself blocked"
summary: "After several read-only steps in a row the run stops: it writes the code it can write or names the information it is missing."
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: Several read-only steps in a row produced no change.
conditions_does_not_apply_when: The reads are part of one bounded investigation.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the reason for the pause
  - the missing information
artifact_contract_verified_by: the run either wrote something or reported the missing information
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stop reading and write something, or report yourself blocked
During task execution, if you make 5+ consecutive Read/Grep/Glob calls without any Edit/Write/Bash action:
STOP. State in one sentence why you haven't written anything yet. Then either:
Write code (you have enough context), or
Report "blocked" with the specific missing information.
Do NOT continue reading. Analysis without action is a stuck signal.
<!-- vpmodule:atom:end stop-reading-and-write-something-or-report-yourself-blocked -->
<!-- vpmodule:atom:begin treat-an-authentication-error-as-a-gate-not-a-failure -->
---
instruction_id: treat-an-authentication-error-as-a-gate-not-a-failure
title: "Treat an authentication error as a gate, not a failure"
summary: "An access refusal stops the task and asks for the credential; it is recorded as ordinary flow, not as a defect."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A tool or an API refuses the call because nobody is signed in.
conditions_does_not_apply_when: The call failed for a reason other than the credential.
artifact_contract_output_type: checkpoint
artifact_contract_required_data:
  - the steps to authenticate
  - the check that confirms it
artifact_contract_verified_by: the run stopped and named the authentication steps instead of retrying blindly
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Treat an authentication error as a gate, not a failure
Auth errors during `type="auto"` execution are gates, not failures.
Recognize it's an auth gate (not a bug)
STOP current task
Provide exact auth steps (CLI commands, where to get keys)
Document auth gates as normal flow, not deviations.
<!-- vpmodule:atom:end treat-an-authentication-error-as-a-gate-not-a-failure -->
<!-- vpmodule:atom:begin verify-the-claims-you-wrote-in-the-summary-before-you-report-done -->
---
instruction_id: verify-the-claims-you-wrote-in-the-summary-before-you-report-done
title: Verify the claims you wrote in the summary before you report done
summary: "The files and the commits the summary names are checked to exist, and a failed check stops the run."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A summary of the work has just been written.
conditions_does_not_apply_when: The summary is not the deliverable.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the self-check result
  - the missing items
artifact_contract_verified_by: the self-check ran and a failure stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Verify the claims you wrote in the summary before you report done
After writing SUMMARY.md, verify claims before proceeding.
Check created files exist:
Check commits exist:
Append result to SUMMARY.md: `## Self-Check: PASSED` or `## Self-Check: FAILED` with missing items listed.
Do NOT skip. Do NOT proceed to state updates if self-check fails.
<!-- vpmodule:atom:end verify-the-claims-you-wrote-in-the-summary-before-you-report-done -->