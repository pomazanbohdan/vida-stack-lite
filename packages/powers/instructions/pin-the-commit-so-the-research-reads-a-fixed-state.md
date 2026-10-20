---
instruction_id: pin-the-commit-so-the-research-reads-a-fixed-state
title: Pin the commit so the research reads a fixed state
summary: "The research reads one recorded commit through git, never the working tree, so a dirty tree stays invisible to it and every citation holds."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A research run over a repository is about to be set up.
conditions_does_not_apply_when: The repository has no version control to read from.
artifact_contract_output_type: pinned-commit
artifact_contract_required_data:
  - the full and short commit
  - the branch
  - the command form used to read the code
artifact_contract_verified_by: every citation was taken at the pinned commit and none came from the working tree
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase-analyzer.md
status: active
revision: 1
---

# Pin the commit so the research reads a fixed state
- the repository and commit, which the research reads alone, so a dirty tree is invisible to it
Before the gate: the repository is the session’s git top level unless the ask names another; record its full and short commit and its branch.
- Read through git at the commit, never your harness’s file or search tools or `git status`, which see the working tree
