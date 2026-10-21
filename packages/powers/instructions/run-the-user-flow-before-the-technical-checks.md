---
instruction_id: run-the-user-flow-before-the-technical-checks
title: Run the user flow before the technical checks
summary: "The script is written in three ordered parts; the user's own steps come first, the technical checks wait until that flow passed, and a failed step stops the run."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - named-protagonist-journey
conditions_applies_when: A script of checks is written for a feature that has a user-facing flow.
conditions_does_not_apply_when: The feature has no user-facing flow.
artifact_contract_output_type: verification-script
artifact_contract_required_data:
  - the user-flow steps
  - the deferred technical checks
  - the coverage check
artifact_contract_verified_by: the user flow ran first and a failure in it stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work/steps/mvp-uat-framing.md
status: active
revision: 1
---

# Run the user flow before the technical checks
Generate the UAT script in three ordered sections: (a) user-flow walk-through derived from the phase's user-story goal, (b) technical checks (deferred — only run after user flow passes), (c) coverage check (goal-backward, narrowed to the user story's outcome clause).
**User-flow steps run first.** Each step is one user action: open, fill, click, type, observe. No HTTP verbs, no JSON shapes, no error codes in user-flow steps.
**Technical checks are deferred.** They run AFTER the user flow passes — same checks as non-MVP mode (endpoint schemas, error states, edge cases), just reordered.
**If user-flow step N fails, do not advance.** The verdict is FAIL; technical checks do not run. The user can re-run after fixing the underlying flow.
