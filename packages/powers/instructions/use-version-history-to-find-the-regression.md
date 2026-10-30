---
instruction_id: use-version-history-to-find-the-regression
title: Use version history to find the regression
summary: "Bisect to the commit that broke things, read what changed recently, blame a line and search the commit messages."
capability_tags:
  - audit-codebase
pattern_tags:
  - evidence-analysis
conditions_applies_when: A defect appeared and the commit that introduced it has to be found.
conditions_does_not_apply_when: The defect is present in the first commit of the history.
artifact_contract_output_type: history-locate
artifact_contract_required_data:
  - the good and bad commits
  - the bisect result
  - the commit that introduced the defect
artifact_contract_verified_by: the bisect ended on one commit and the test was run at each step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Use version history to find the regression

Find which commit introduced a bug:

```bash
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
```

Git checkouts midpoints; run your test at each to narrow down.

View what changed recently:

```bash
git log --oneline -20
git diff HEAD~5..HEAD -- src/
```

Find who last changed a specific line:

```bash
git blame src/services/task.ts
```

Search commit messages for a keyword:

```bash
git log --grep="validation" --oneline
```
