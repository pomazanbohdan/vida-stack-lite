---
instruction_id: close-with-a-short-completion-summary
title: Close with a short completion summary
summary: "The run ends with one or two sentences: what changed, the verification and review result including what was deferred, and the commit hash; never a file list and never a process narration."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The work is finished and the result is reported to the person who asked for it.
conditions_does_not_apply_when: The work is paused for a handoff or the result is still being produced.
artifact_contract_output_type: completion-summary
artifact_contract_required_data:
  - what changed
  - the verification and review result
  - what was deferred
  - the commit hash when one was created
artifact_contract_verified_by: "the summary is one or two sentences and names the change, the result and the commit without listing files"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-05-present.md
status: active
revision: 1
---

# Close with a short completion summary

Change `{plan_file}` status to `built` in the frontmatter.

If version control is available and the tree is dirty, create a local commit with a conventional message derived from the plan title.

NEVER auto-push.

Display a very short completion summary — one or two sentences — including:

- What changed.
- The verification and review result, including whether anything was deferred.
- The commit hash, if one was created.

Do not list changed files, repeat details from the plan, or narrate the process unless the user asks.

Offer applicable next actions in one short line: when version control and a remote are available

- create a pull request (and push first if needed)
- or make another change
