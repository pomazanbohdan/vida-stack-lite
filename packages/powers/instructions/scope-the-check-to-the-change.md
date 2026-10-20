---
instruction_id: scope-the-check-to-the-change
title: Scope the check to the change
summary: "Check the lines the change touched, not the whole repository, and read the coverage the suite already produced."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: "A check runs over the whole repository, or a coverage number has to be produced for a change."
conditions_does_not_apply_when: "The check is a whole-project measure by definition, such as a bundle size budget."
artifact_contract_output_type: scoped-check
artifact_contract_required_data:
  - the scope of the check
  - the lines or files in scope
  - the coverage source that was reused
artifact_contract_verified_by: the check ran over the changed lines only and no second test run was needed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 1
---

# Scope the check to the change

**Scope to the diff.** Check the lines this change touched, not the whole repo. Coverage of changed lines is a number the agent can move; project coverage is one it inherited.

**Scope the expensive ones to the diff.** `stryker run --mutate` on the whole repo takes hours and gets turned off; on the files a change touched it takes under a minute. Same for Semgrep, which takes a path list.

**Coverage needs no second test run.** Read the lcov your suite already writes and intersect it with `git diff`. Running the suite twice to get a number is the fastest way to make people hate this.
