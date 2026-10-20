---
instruction_id: compose-the-review-prompt-from-paths-and-intent
title: Compose the review prompt from paths and intent
summary: "The launch prompt carries the absolute paths and the intent, never the diff text, and the reviewer's own instruction file is not read by the launcher."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A review lens is about to be launched against the staged change.
conditions_does_not_apply_when: The lens runs inside this session and reads the files itself.
artifact_contract_output_type: lens-launch-prompt
artifact_contract_required_data:
  - the substituted paths
  - the intent
  - the prompt text
artifact_contract_verified_by: the prompt carries no diff text and names the intent of the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-02-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/review-a-change.md
status: active
revision: 2
---

# Compose the review prompt from paths and intent
Try running all active lenses simultaneously: substitute the runtime placeholders (`{diff_file}`, `{claims_file}`, `{plan_file}`, `{verbatim_intent}`) into each lens's instruction.
`{diff_file}`, `{claims_file}`, and `{plan_file}` are paths: substitute the absolute path and let the lens read the file — a launch prompt never carries diff text, and the child's working directory is not yours.
`{verbatim_intent}` is the intent section of `{plan_file}` if it has one, else the user's or conversation's own words on what the change is for, substituted inline as text; a request to review something is not an intent.
When an instruction launches a reviewer subagent, launch that child with the prompt text after placeholder substitution; do not load the reviewer instruction file yourself.
If you have a spec, requirements, or even a stream of consciousness for what this change is supposed to implement, feed that in too.
Review quality depends on it — without intent, the reviewers can only judge the diff against itself.
Have it pass the PR description to the review every time, and the ticket's plan when possible.
