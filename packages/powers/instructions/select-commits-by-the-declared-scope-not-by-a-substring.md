---
instruction_id: select-commits-by-the-declared-scope-not-by-a-substring
title: "Select commits by the declared scope, not by a substring"
summary: "A commit belongs to a unit of work because its header declares that scope, compared as an exact string; a commit that merely mentions the scope is not a member."
capability_tags:
  - harden-validation
pattern_tags:
  - stable-identity
conditions_applies_when: Commits are selected for a unit of work by the scope their header declares.
conditions_does_not_apply_when: The commits are selected explicitly by the caller.
artifact_contract_output_type: commit-selection
artifact_contract_required_data:
  - the declared scope
  - the target scope
  - the commits that declare it
artifact_contract_verified_by: the selection is made by an exact comparison of the declared scope and nothing is selected by a substring match
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/undo.md
status: active
revision: 1
---

# Select commits by the declared scope, not by a substring
**Selection is a structural parse, not a substring grep (#4661).**
it validates `${TARGET_PHASE}` (refusing before any git command runs on an invalid id), then parses each candidate commit's subject through the SAME anchored `type(scope)!:` conventional-commit header the changelog/PR-title gate uses and compares the DECLARED scope to `${TARGET_PHASE}` by exact string equality
No `--all`:** only commits reachable from `HEAD` may be reverted, because reverting a commit that is not in the current branch's history stages a change the branch never received.
