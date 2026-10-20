---
instruction_id: place-checks-by-cost
title: Place each check by cost
summary: "Types, lint and secrets run in the edit loop, related tests and changed-line coverage at task end, everything else at review or in CI, and every check is scoped to the diff."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: "Checks are being scheduled into the edit loop, the task end, review and CI."
conditions_does_not_apply_when: There is only one check and its cost is already fixed.
artifact_contract_output_type: check-schedule
artifact_contract_required_data:
  - the checks
  - the tier each check runs in
  - the scope of each check
artifact_contract_verified_by: the edit loop runs only the checks that finish in seconds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/constraints.md
status: active
revision: 1
---

# Place each check by cost
5. **Place each check by cost.** Types, lint and secrets in the edit loop (seconds). Related tests and changed-line coverage at task end (under 90s). Everything else at review or in CI. Scope checks to the diff, not the whole repo.
