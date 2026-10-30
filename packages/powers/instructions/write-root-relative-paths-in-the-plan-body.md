---
instruction_id: write-root-relative-paths-in-the-plan-body
title: Write root-relative paths in the plan body
summary: Every path in the plan body is relative to the checkout root; an absolute path pins the command to one checkout.
capability_tags:
  - plan-implementation
pattern_tags:
  - worktree-isolation
conditions_applies_when: A path is written into the body of a plan.
conditions_does_not_apply_when: "The path is an input the prompt supplied, not one the plan names."
artifact_contract_output_type: path-form
artifact_contract_required_data:
  - the path as written
  - the root it is relative to
artifact_contract_verified_by: no path in the plan body is absolute
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write root-relative paths in the plan body
Every path in the plan *body* — `<files>`, `<verify>`, `<automated>`, task actions — is repo-root-relative, and every `<automated>` command assumes cwd at the checkout root
An absolute path copied from the prompt into `<automated>` pins the command to the orchestrator's checkout; under worktree isolation the executor's checkout is a different directory, so the command `cd`s into the main tree, finds it, runs, and **passes against code the worktree changed and the main tree did not**
It binds `prior_verify_commands` too: a harvested command that carries an absolute path is re-rooted before reuse, never copied verbatim — it "worked" in a run that may have been verifying the wrong checkout
