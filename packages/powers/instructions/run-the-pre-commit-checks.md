---
instruction_id: run-the-pre-commit-checks
title: Run the pre-commit checks
summary: "Before every commit, look at the staged diff, scan it for secrets, and run the tests, the linter and the type check."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A commit is about to be created.
conditions_does_not_apply_when: No commit is being created.
artifact_contract_output_type: pre-commit-checklist
artifact_contract_required_data:
  - the staged diff reviewed
  - the secret scan result
  - the test result
  - the lint result
  - the type check result
artifact_contract_verified_by: all five checks ran and their results are known before the commit is made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
---

# Run the pre-commit checks

Before every commit:

```bash
# 1. Check what you're about to commit
git diff --staged

# 2. Ensure no secrets
git diff --staged | grep -i "password\|secret\|api_key\|token"

# 3. Run tests
npm test

# 4. Run linting
npm run lint

# 5. Run type checking
npx tsc --noEmit
```

Automate this with git hooks:
Hooks should run so issues surface at the introducing commit, and silent bypass violates the project guidance.
Do NOT use `--no-verify` by default
Budget 1-2 retry cycles per commit
