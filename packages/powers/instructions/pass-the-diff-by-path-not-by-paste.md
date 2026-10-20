---
instruction_id: pass-the-diff-by-path-not-by-paste
title: "Pass the diff by path, not by paste"
summary: The review lanes read the staged diff from its path; the diff text is never pasted into a review prompt.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review lane is launched over a change.
conditions_does_not_apply_when: The review reads the change from the working copy directly.
artifact_contract_output_type: review-dispatch
artifact_contract_required_data:
  - the path of the staged diff
  - the lanes that read it
artifact_contract_verified_by: no prompt carried the diff text
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 1
---

# Pass the diff by path, not by paste
The review lenses read that file; the diff text is never pasted into their prompts.
Before launching a lens, expand its skill-root placeholder to this skill's absolute installed directory; never leave that placeholder unresolved in a child prompt.
