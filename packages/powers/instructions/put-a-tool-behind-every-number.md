---
instruction_id: put-a-tool-behind-every-number
title: Put a tool behind every number
summary: "A number with no check behind it is an aspiration: each dimension gets the de facto tool, the exact command is recorded next to the rule, and a dimension that cannot run is dropped rather than invented."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: A number in the quality bar has no check behind it yet.
conditions_does_not_apply_when: "The dimension needs a target the project cannot provide, such as a running URL it does not have."
artifact_contract_output_type: check-inventory
artifact_contract_required_data:
  - each dimension
  - the tool behind it
  - the exact command
  - the dimensions dropped for lack of a runnable target
artifact_contract_verified_by: every number in the quality bar has a command that runs it
compatibility_excludes: []
compatibility_requires:
  - write-the-quality-bar-as-a-floor-with-exceptions
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/constraints.md
status: active
revision: 1
---

# Put a tool behind every number
4. **Install what each picked dimension needs.** A dimension with a number and no tool behind it is an aspiration.
Use the de facto tool so existing config keeps working:
a code scanner for code scanning, a secret scanner for secrets, a dependency auditor for dependencies, an accessibility checker for accessibility, a web-vitals measurement for web vitals, a bundle-size limit for bundles, a dependency-boundary checker for boundaries, a mutation tester for assertion quality.
Record the exact command next to each rule in CONSTRAINTS.md. Accessibility and performance need a running URL; if the project has none, say so and drop the dimension rather than inventing a check. Add the commands to package.json as check:fast / check:task / check:full.
