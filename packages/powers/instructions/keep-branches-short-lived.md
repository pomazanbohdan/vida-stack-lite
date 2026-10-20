---
instruction_id: keep-branches-short-lived
title: Keep branches short-lived
summary: "Cut branches from the trunk, merge them back within days, and delete them after the merge."
capability_tags:
  - integrate-branch
pattern_tags:
  - short-lived-branches
conditions_applies_when: A branch is created for new work and will be merged later.
conditions_does_not_apply_when: The branch is a release branch or a deliberately long-lived line of work.
artifact_contract_output_type: branch-lifecycle
artifact_contract_required_data:
  - the base branch
  - the branch name
  - the merge and delete decision
artifact_contract_verified_by: "the branch is cut from the trunk, named by its kind and deleted after the merge"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 1
---

# Keep branches short-lived

Keep `main` always deployable. Work in short-lived feature branches that merge back within 1-3 days. Long-lived development branches are hidden costs — they diverge, create merge conflicts, and delay integration. DORA research consistently shows trunk-based development correlates with high-performing engineering teams.

- **Dev branches are costs.** Every day a branch lives, it accumulates merge risk.
- **Release branches are acceptable.** When you need to stabilize a release while main moves forward.
- **Feature flags > long branches.** Prefer deploying incomplete work behind flags rather than keeping it on a branch for weeks.

This is the recommended default. Teams using gitflow or long-lived branches can adapt the principles (atomic commits, small changes, descriptive messages) to their branching model — the commit discipline matters more than the specific branching strategy.

- Branch from `main` (or the team's default branch)
- Delete branches after merge

Branch naming:

```
feature/<short-description>   → feature/task-creation
fix/<short-description>       → fix/duplicate-tasks
chore/<short-description>     → chore/update-deps
refactor/<short-description>  → refactor/auth-module
```

Long-lived branches that diverge significantly from main
