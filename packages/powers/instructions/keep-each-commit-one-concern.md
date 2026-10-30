---
instruction_id: keep-each-commit-one-concern
title: Keep each commit one concern
summary: "Each commit does one logical thing, and formatting, refactoring and behaviour changes never share a commit."
capability_tags:
  - integrate-branch
pattern_tags:
  - code-minimization
conditions_applies_when: A commit is being written and its content can hold more than one kind of change.
conditions_does_not_apply_when: The commit already carries a single logical change.
artifact_contract_output_type: atomic-commit
artifact_contract_required_data:
  - the one logical thing the commit does
  - the changes kept out of it
artifact_contract_verified_by: the commit can be described in one line and holds one kind of change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep each commit one concern

Each commit does one logical thing:

```
# Good: Each commit is self-contained
a1b2c3d Add task creation endpoint with validation
d4e5f6g Add task creation form component
h7i8j9k Connect form to API and add loading state
m1n2o3p Add task creation tests (unit + integration)

# Bad: Everything mixed together
x1y2z3a Add task feature, fix sidebar, update deps, refactor utils
```

Don't combine formatting changes with behavior changes. Don't combine refactors with features. Each type of change should be a separate commit — and ideally a separate PR:

Commit messages like "fix", "update", "misc"

Formatting changes mixed with behavior changes
