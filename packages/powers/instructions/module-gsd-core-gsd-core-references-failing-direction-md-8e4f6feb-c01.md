---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-failing-direction-md-8e4f6feb-c01"
title: "gsd-core: gsd-core/references/failing-direction.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/failing-direction.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/failing-direction.md\"}"
atom_ids:
  - keep-prose-judgments-advisory-and-blockers-reproducible
  - report-the-missing-failure-signal-dont-write-it-for-them
  - require-a-stated-failure-signal-for-every-acceptance-command
atom_count: 3
atoms: "[{\"atom_id\":\"keep-prose-judgments-advisory-and-blockers-reproducible\",\"file_sha256\":\"f463ec544d4ad3ea44193fa3da42ffb38bf9fe4837e22c73a4034bf004561655\",\"content_sha256\":\"24596a554ca1b2b91424ac484f845b9e2e44be0a20dfc468e7903a3ce147b8dc\",\"file_bytes\":1581,\"body_bytes\":398},{\"atom_id\":\"report-the-missing-failure-signal-dont-write-it-for-them\",\"file_sha256\":\"f8c8c609a73212022829d0401ec7599d92b1720d1b8a8a29cff2323ab1560cc6\",\"content_sha256\":\"1c213abe758beb743973b7c7b21f85afedcf66b4f9f51862c3b3bc76233a3623\",\"file_bytes\":1376,\"body_bytes\":254},{\"atom_id\":\"require-a-stated-failure-signal-for-every-acceptance-command\",\"file_sha256\":\"45f9917a67e970516b5fe4c79ab528bb77742cded345c661e33d5a82af8be23f\",\"content_sha256\":\"b6933962db060e58fc242074e1651b645336869323caaa973c8d65d4f04d65dc\",\"file_bytes\":1775,\"body_bytes\":667}]"
carrier_sha256: f9dbbbbcd4bb448453518e9917b58328a95098babd3fd791bcadf97aea4fbfa0
carrier_bytes: 5247
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-prose-judgments-advisory-and-blockers-reproducible -->
---
instruction_id: keep-prose-judgments-advisory-and-blockers-reproducible
title: Keep prose judgments advisory and blockers reproducible
summary: A vacuous failure statement is reported as Important; the Critical level stays with the deterministic layer so that it is always reproducible.
capability_tags:
  - review-code
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A failure statement is present but says nothing observable.
conditions_does_not_apply_when: The deterministic check found the statement missing or empty.
artifact_contract_output_type: vacuous-statement-finding
artifact_contract_required_data:
  - the command
  - the vacuous statement
  - what a usable statement looks like
artifact_contract_verified_by: the finding is Important and names an observable signal instead of raising it to Critical
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep prose judgments advisory and blockers reproducible
Do **not** escalate a vacuous statement to Critical: the deterministic layer owns the blockers so that a Critical is always reproducible, and prose judgment stays advisory.
Raise those as an Important, naming what a usable statement looks like (an exit code, a string in the output, a missing line).
Your added judgment, on `ok` rows only:
<!-- vpmodule:atom:end keep-prose-judgments-advisory-and-blockers-reproducible -->
<!-- vpmodule:atom:begin report-the-missing-failure-signal-dont-write-it-for-them -->
---
instruction_id: report-the-missing-failure-signal-dont-write-it-for-them
title: "Report the missing failure signal, don't write it for them"
summary: "The missing failure signal is reported, not authored: a statement written for the planner is copied verbatim and carries no information."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: An acceptance command has no stated failure mode.
conditions_does_not_apply_when: The plan is being written rather than checked.
artifact_contract_output_type: missing-failure-report
artifact_contract_required_data:
  - the command without a failure signal
  - the evidence that it lacks one
artifact_contract_verified_by: the finding names the command and writes no replacement statement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report the missing failure signal, don't write it for them
Report, never prescribe. State which command has no stated failure mode.
Do **not** author the statement for the planner.
A prescribed statement is copied verbatim and carries zero information
<!-- vpmodule:atom:end report-the-missing-failure-signal-dont-write-it-for-them -->
<!-- vpmodule:atom:begin require-a-stated-failure-signal-for-every-acceptance-command -->
---
instruction_id: require-a-stated-failure-signal-for-every-acceptance-command
title: Require a stated failure signal for every acceptance command
summary: Every runnable acceptance command states what its failure looks like; a command without a failure mode is not an acceptance test.
capability_tags:
  - review-code
pattern_tags:
  - testable-criteria
conditions_applies_when: A plan states acceptance commands.
conditions_does_not_apply_when: The command is a placeholder that is not runnable yet.
artifact_contract_output_type: acceptance-command-check
artifact_contract_required_data:
  - the command
  - its stated failure signal
  - the binding between them
artifact_contract_verified_by: every runnable command carries a failure statement bound to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Require a stated failure signal for every acceptance command
For each runnable `<automated>` command, does the plan say what output constitutes failure?
A command with no expressible failure mode is not an acceptance test — it reads as rigour and delivers none.
Requiring a stated failing direction is the only shape that catches the silent case, because it forces the plan to name the failure signal rather than assume the command has one.
Within one `<task>`, each `<fails_when>` binds to the nearest **preceding** `<automated>`; a command's binding statement is the **first** one that follows it.
N runnable commands need N statements.
Length is not a signal.
<!-- vpmodule:atom:end require-a-stated-failure-signal-for-every-acceptance-command -->