---
instruction_id: write-the-paths-in-the-artifact-relative-to-the-root
title: Write the paths in the artifact relative to the root
summary: "Every path written into the artifact is relative to the repository root, because an absolute path pins the command to one checkout and lets it pass against code another checkout changed."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "A path is written into a plan, a task, a verify block or a command."
conditions_does_not_apply_when: "The path only appears in the prompt the agent reads, not in the artifact it writes."
artifact_contract_output_type: path-convention
artifact_contract_required_data:
  - the paths written into the artifact
  - the root they are relative to
  - the assumption about the working directory
artifact_contract_verified_by: no absolute path survives in the artifact and every command assumes the checkout root as the working directory
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-verify-command-grounding.md
status: active
revision: 1
---

# Write the paths in the artifact relative to the root
**Root-relative, never absolute.** The paths in your prompt's `<required_reading>` are absolute on purpose
a subagent's cwd may differ from the orchestrator's That rule covers prompt *inputs* only. Every path in the plan *body* - `<files>`, `<verify>`, `<automated>`, task actions - is repo-root-relative, and every `<automated>` command assumes cwd at the checkout root. An absolute path copied from the prompt into `<automated>` pins the command to the orchestrator's checkout; under worktree isolation the executor's checkout is a different directory, so the command `cd`s into the main tree, finds it, runs, and **passes against code the worktree changed and the main tree did not**.
The path probe reports such a target as `outside_root` (a warning), but only when the target is outside the *orchestrator's* root - an absolute path *inside* it is exactly the shape that passes the probe and still misfires under isolation. The authoring rule is the fix; the probe is the backstop.
It binds `prior_verify_commands` too: a harvested command that carries an absolute path is re-rooted before reuse, never copied verbatim - it "worked" in a run that may have been verifying the wrong checkout.
