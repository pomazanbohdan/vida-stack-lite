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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
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
must fork off the project's default branch (`origin/HEAD`), not off whatever HEAD happens to be checked out — otherwise consecutive quick tasks compound on top of each other and stay unpushed
already exists locally, reuse it as-is so resumed work is not rebased
Resolve the remote/network issue and retry.
All quick-task commits for this run stay on that branch. User handles merge/rebase afterward.
