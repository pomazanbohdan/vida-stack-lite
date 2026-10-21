---
instruction_id: push-the-generated-branch-not-the-one-you-worked-on
title: "Push the generated branch, not the one you worked on"
summary: The branch that carries the private history stays local; the generated branch is the one that is published.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A generated branch exists beside the branch the work was done on.
conditions_does_not_apply_when: There is no generated branch.
artifact_contract_output_type: publication-command
artifact_contract_required_data:
  - the branch to push
  - the branch that stays local
artifact_contract_verified_by: the generated branch was pushed and the working branch was not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/publish-prs-without-planning-artifacts.md
status: active
revision: 1
---

# Push the generated branch, not the one you worked on
**Push the generated `-pr` branch, never your working branch** — the working branch is where the planning history lives, and it is the one thing that must not reach the remote.
