---
instruction_id: follow-the-trail-only-through-a-cited-commit
title: Follow the trail only through a cited commit
summary: "A pull request or an issue is reached only through a commit that is cited, and only what it says about the change it made is taken from it."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: The origin of a cited line is being traced.
conditions_does_not_apply_when: The origin is already recorded in the document.
artifact_contract_output_type: history-trace
artifact_contract_required_data:
  - the commit cited
  - the pull request or issue reached through it
  - what was taken from it
artifact_contract_verified_by: the pull request or issue was reached through a cited commit and only what it says about its own change was taken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-historian.md
status: active
revision: 1
---

# Follow the trail only through a cited commit
- Reach a pull request or issue only through a commit you cite, and take from it what it says about the change it made, never what it says comes next.
- Work back from the brief’s commit only: `git blame -L <start>,<end> <commit> -- <path>` on the cited lines, `git log -S<symbol> <commit>` or `-G<regex>`, then the pull request that brought a commit in
