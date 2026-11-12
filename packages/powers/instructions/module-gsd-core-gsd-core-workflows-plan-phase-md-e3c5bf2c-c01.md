---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-plan-phase-md-e3c5bf2c-c01"
title: "gsd-core: gsd-core/workflows/plan-phase.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/plan-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/plan-phase.md\"}"
atom_ids:
  - copy-the-proven-verify-command
  - count-an-unclassified-severity-as-critical
  - distinguish-a-check-that-could-not-look-from-nothing-to-compare
  - do-not-touch-the-branch-while-planning
  - look-on-disk-before-you-call-a-run-empty
  - name-the-symbols-the-phase-creates
  - refuse-to-mark-the-work-planned-when-an-item-has-no-plan
  - reuse-the-existing-research-without-prompting
atom_count: 8
atoms: "[{\"atom_id\":\"copy-the-proven-verify-command\",\"file_sha256\":\"b356a7fc9fc683cd5ef1849db5bc1a534da8b8c51fdc6a51d6f49ffafcd958ef\",\"content_sha256\":\"0476fc0235702289cd78b02a787f1ab1c46321ae797f36e1e9f79c61928a9a7c\",\"file_bytes\":1252,\"body_bytes\":240},{\"atom_id\":\"count-an-unclassified-severity-as-critical\",\"file_sha256\":\"b5a44833ce8d27a0d3f2caa8f81ac16890630dafe1bdbcb6f491ef3b22573d73\",\"content_sha256\":\"9f63dad2d06ceaaf15261512713e20a62889c315d487804ce1df341078efe1af\",\"file_bytes\":1907,\"body_bytes\":703},{\"atom_id\":\"distinguish-a-check-that-could-not-look-from-nothing-to-compare\",\"file_sha256\":\"c84767fa417e6abc0cf58c01588f5ef794d46e24406ebcfba108c974456f46e7\",\"content_sha256\":\"071b25f22534c656c3895c9f25eb9b978cf6fdbddf46e55571c5b3996056f69a\",\"file_bytes\":1770,\"body_bytes\":523},{\"atom_id\":\"do-not-touch-the-branch-while-planning\",\"file_sha256\":\"3386fad10fc0cdce024007b4c86ef5ce21b307c43d3a41cec510a2dba4d52fa2\",\"content_sha256\":\"679db83258d027a8b0768a9933d98b83c42b2e3603e5ba5d2d7f3b531f40148d\",\"file_bytes\":1267,\"body_bytes\":207},{\"atom_id\":\"look-on-disk-before-you-call-a-run-empty\",\"file_sha256\":\"13002ab60052671229428b967cbd0f339ff826bdf1098431eae7c11559b369c6\",\"content_sha256\":\"1aa4179d301c3064c012952081efabba0f9b322e88c24b717db1cf3bab608588\",\"file_bytes\":1523,\"body_bytes\":244},{\"atom_id\":\"name-the-symbols-the-phase-creates\",\"file_sha256\":\"865b4a2bbeae5738c53afe5bcf10124b8a6b5e0c8678514609aa50a44eab8e06\",\"content_sha256\":\"fe046a503e48d0193bcb36f251632bae08182fa0933a850e62acc92c051d7496\",\"file_bytes\":1565,\"body_bytes\":381},{\"atom_id\":\"refuse-to-mark-the-work-planned-when-an-item-has-no-plan\",\"file_sha256\":\"effee0d596566783737ed1ab62cbdf14165c2441640496b9e8e64a804f2263e5\",\"content_sha256\":\"d0efaefbf94678878004284c2b354aa2dda795770b678719ed2c3fb3e7b32b56\",\"file_bytes\":1383,\"body_bytes\":276},{\"atom_id\":\"reuse-the-existing-research-without-prompting\",\"file_sha256\":\"218e4c580e22d6346ad294b98fd40a9df24fb3a20175d123128d0fd77a7c3ea1\",\"content_sha256\":\"7d06e770c349a04a10704bb2d34f1f2fa6fc7416e9b23a521f6e139e21833fa4\",\"file_bytes\":1417,\"body_bytes\":217}]"
carrier_sha256: 6736bcd381fa41c0b4091460107376f78aaa944f006a1bd1511a979127a428e0
carrier_bytes: 13243
revision: 1
status: active
---
<!-- vpmodule:atom:begin copy-the-proven-verify-command -->
---
instruction_id: copy-the-proven-verify-command
title: Copy the proven verify command
summary: The check that the neighbouring work already ran is reused verbatim instead of being re-derived.
capability_tags:
  - verify-work-results
pattern_tags:
  - project-conventions-first
conditions_applies_when: A neighbouring piece of work already ran the same kind of check.
conditions_does_not_apply_when: No prior run of the same check exists.
artifact_contract_output_type: reused-verify-command
artifact_contract_required_data:
  - the command that was copied
  - the run it came from
artifact_contract_verified_by: the command was copied verbatim and no path was re-derived
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Copy the proven verify command
They resolved from the executor's cwd in a real run, so a path here is grounded evidence, not a guess.
When this phase's build/test story is the same, copy the command verbatim
Do not re-derive a directory.
<!-- vpmodule:atom:end copy-the-proven-verify-command -->
<!-- vpmodule:atom:begin count-an-unclassified-severity-as-critical -->
---
instruction_id: count-an-unclassified-severity-as-critical
title: Count an unclassified severity as Critical
summary: A finding whose severity is missing or unrecognised counts as Critical; only a finding that is explicitly Minor is an advisory.
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
  - impact-based-severity
conditions_applies_when: The severity of a reported finding has to be counted.
conditions_does_not_apply_when: Every finding carries a severity that is already known.
artifact_contract_output_type: severity-count
artifact_contract_required_data:
  - the findings and the severity each one carries
  - the count of the findings that block
artifact_contract_verified_by: a finding without a usable severity was counted as Critical and an advisory count was only taken from explicitly Minor findings
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Count an unclassified severity as Critical
Parse issue count from checker return:

an entry whose severity is missing or unrecognized counts as a Critical (fail closed)

A `## VERIFICATION PASSED` return that lists a BLOCKER or WARNING entry in prose — in its YAML issues block or in the surrounding text — counts those entries the same way; a mention such as "no warnings" or a zero count is not an entry. The sentinel never decides alone.

If the checker's return contains no YAML issues block and lists no BLOCKER or WARNING entry in prose, treat `issue_count` as 0 and skip the stall check — the plan passed.

every entry in the block is explicitly Minor

display any advisories and proceed
<!-- vpmodule:atom:end count-an-unclassified-severity-as-critical -->
<!-- vpmodule:atom:begin distinguish-a-check-that-could-not-look-from-nothing-to-compare -->
---
instruction_id: distinguish-a-check-that-could-not-look-from-nothing-to-compare
title: Distinguish a check that could not look from nothing to compare
summary: "A check that failed to run is reported as a warning and the run continues; it is never read as \"nothing to compare\"."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A gate or a pre-check could not read its evidence.
conditions_does_not_apply_when: The check ran and returned a verdict.
artifact_contract_output_type: check-unavailability
artifact_contract_required_data:
  - the warning that was raised
  - the decision the run took on it
artifact_contract_verified_by: the unreadable check was reported as a warning and never counted as a clean result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Distinguish a check that could not look from nothing to compare
A gate that failed to run
is a check that could not look, not "nothing to compare":
the warning above is its signal, and planning continues (the check is advisory).
A caller error about the phase directory — not found, not a directory, unreadable, or holding no plans — returns `total` and `honored` as `null` and `not_honored` as an empty list. Pass the nulls through; never coerce them to `0`, and never report a count for evidence that was not read.
<!-- vpmodule:atom:end distinguish-a-check-that-could-not-look-from-nothing-to-compare -->
<!-- vpmodule:atom:begin do-not-touch-the-branch-while-planning -->
---
instruction_id: do-not-touch-the-branch-while-planning
title: Do not touch the branch while planning
summary: "Planning does not create, rename or switch branches: the branch identity belongs to whoever owns it."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A planning step is running in a repository with branches.
conditions_does_not_apply_when: The branch change was requested explicitly by the owner.
artifact_contract_output_type: branch-invariance
artifact_contract_required_data:
  - the branch that was left untouched
  - the owner of the branch identity
artifact_contract_verified_by: "no branch was created, renamed or switched during the planning step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not touch the branch while planning
Do not switch branches.
A phase rename in the plan document
is a plan-level change only — it does not mutate git branch names.
Branch identity belongs to the user.
<!-- vpmodule:atom:end do-not-touch-the-branch-while-planning -->
<!-- vpmodule:atom:begin look-on-disk-before-you-call-a-run-empty -->
---
instruction_id: look-on-disk-before-you-call-a-run-empty
title: Look on disk before you call a run empty
summary: "A run that returned nothing is checked on disk before it is called empty: the plans it wrote are offered as accept, retry or stop."
capability_tags:
  - verify-work-results
  - read-large-artifacts
pattern_tags:
  - empty-result-policy
  - verification-before-completion
conditions_applies_when: A dispatched run returned nothing or a truncated result.
conditions_does_not_apply_when: The run returned its result.
artifact_contract_output_type: empty-run-recovery
artifact_contract_required_data:
  - the plans found on disk
  - the recovery route that was taken
artifact_contract_verified_by: the disk was checked before the run was declared empty and the recovery route was taken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/detail/elaboration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Look on disk before you call a run empty
The planner wrote plans to disk but the return was empty or truncated
The planner produced no output.
1. **Accept plans**
2. **Retry planner** — re-spawn the planner with the same prompt
3. **Stop**
<!-- vpmodule:atom:end look-on-disk-before-you-call-a-run-empty -->
<!-- vpmodule:atom:begin name-the-symbols-the-phase-creates -->
---
instruction_id: name-the-symbols-the-phase-creates
title: Name the symbols the phase creates
summary: "The plan lists every symbol the phase introduces, so that a later check does not report a new symbol as missing."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The plan declares the symbols the phase will create.
conditions_does_not_apply_when: The phase creates no new symbols.
artifact_contract_output_type: produced-symbols
artifact_contract_required_data:
  - the symbols the phase creates
  - the kinds of symbol it names
artifact_contract_verified_by: every created symbol is listed and the list is used to exempt them from the drift check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Name the symbols the phase creates
List every symbol this phase creates: decorators, classes, functions, CLI flags, struct/dataclass fields, new file paths.
Do NOT verify symbols the plan declares under its "Artifacts this phase produces" section
those are created by this phase, not references to existing code.
omitting it causes new symbols to be flagged for acknowledgement.
<!-- vpmodule:atom:end name-the-symbols-the-phase-creates -->
<!-- vpmodule:atom:begin refuse-to-mark-the-work-planned-when-an-item-has-no-plan -->
---
instruction_id: refuse-to-mark-the-work-planned-when-an-item-has-no-plan
title: Refuse to mark the work planned when an item has no plan
summary: The planning step is not closed while a requirement or a locked decision is invisible to every plan.
capability_tags:
  - plan-implementation
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: The coverage of the plans against the tracked requirements and decisions is checked.
conditions_does_not_apply_when: Nothing is tracked against the plans.
artifact_contract_output_type: coverage-gate
artifact_contract_required_data:
  - the requirement or decision that no plan covers
  - the options offered
artifact_contract_verified_by: the work was not marked planned while an uncovered tracked item remained
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Refuse to mark the work planned when an item has no plan
Extract requirement IDs claimed by plans
Re-plan to include missing requirements (recommended)
Move uncovered requirements to next phase
Catching that now beats discovering it after thousands of dollars of execution.
<!-- vpmodule:atom:end refuse-to-mark-the-work-planned-when-an-item-has-no-plan -->
<!-- vpmodule:atom:begin reuse-the-existing-research-without-prompting -->
---
instruction_id: reuse-the-existing-research-without-prompting
title: Reuse the existing research without prompting
summary: When the research artifact already exists it is used as it is — the run neither asks nor re-does it.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The research artifact for the work already exists.
conditions_does_not_apply_when: A refresh was asked for explicitly.
artifact_contract_output_type: research-reuse
artifact_contract_required_data:
  - the artifact that was reused
  - the reason no prompt was shown
artifact_contract_verified_by: the existing research was used and the run neither prompted nor re-spawned it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/research-only-modifiers.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
  - operations
---

# Reuse the existing research without prompting
auto-use the existing research and exit cleanly — do not prompt, do not re-spawn.
force-refresh re-research without prompting.
Do not prompt when the artifact exists.
<!-- vpmodule:atom:end reuse-the-existing-research-without-prompting -->