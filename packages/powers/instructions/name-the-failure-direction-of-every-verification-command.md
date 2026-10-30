---
instruction_id: name-the-failure-direction-of-every-verification-command
title: Name the failure direction of every verification command
summary: "Every runnable verification command carries a sibling statement of what output counts as failure, so a command that cannot fail can no longer read as rigour."
capability_tags:
  - verify-work-results
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A plan or a work item states the command that decides whether the work is done.
conditions_does_not_apply_when: "The command is not runnable, or the decision does not rest on a command."
artifact_contract_output_type: stated-failure-direction
artifact_contract_required_data:
  - the command that decides the work
  - the sibling statement of what output constitutes failure
artifact_contract_verified_by: "every runnable command names the failure signal, and a missing or placeholder statement blocks"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/stated-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the failure direction of every verification command
A plan's `<automated>` block is the thing that decides whether work is done, and nothing checked that the command inside it could fail.
They read as rigour and were not falsifiable, so three separate executors each rediscovered the defect and improvised a substitute at execution time.
Every runnable `<automated>` command now needs a `<fails_when>` sibling naming what output constitutes failure:
Requiring a stated failing direction needs no toolchain knowledge at all, and it is the only one of the three that catches the dangerous case: the motivating command exited non-zero, so it failed loudly, but the same class of error with a command that exits 0 on a no-op passes green and silently. Naming the failure signal is what makes that visible.
The probe is deterministic and owns the blockers: a statement is missing, blank, or a whole-value placeholder (`TBD`, `TODO`, `N/A`, `NA`, `none`, `unknown`, `TBA`, `?`, `-`).
Whether the statement names the *right* signal is prose judgment
Every BLOCKER stays reproducible; judgment stays advisory.
