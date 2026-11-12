---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-claude-commands-constraints-md-23656a41-c01"
title: "addy-skills: .claude/commands/constraints.md module"
summary: "Carrier for 5 atomic instructions from addy-skills:.claude/commands/constraints.md."
source: "{\"donor\":\"addy-skills\",\"path\":\".claude/commands/constraints.md\"}"
atom_ids:
  - detect-the-project-before-asking
  - keep-the-quality-bar-as-a-rising-floor
  - place-checks-by-cost
  - put-a-tool-behind-every-number
  - write-the-quality-bar-as-a-floor-with-exceptions
atom_count: 5
atoms: "[{\"atom_id\":\"detect-the-project-before-asking\",\"file_sha256\":\"0e086d358c5c056abcdefde8e98d241a2fe0846561378aabaff19f0b1a4aa812\",\"content_sha256\":\"65332be960c2e2e0d0372d446cd7aa3640c80287ef37ed5d1a2b52aa9f48839f\",\"file_bytes\":2260,\"body_bytes\":869},{\"atom_id\":\"keep-the-quality-bar-as-a-rising-floor\",\"file_sha256\":\"e58373cc2a6e7708369e49b4e5a92887419a1ec91394f4621240bf1eb78ff9b7\",\"content_sha256\":\"681b5412305509edfc6f8e9539577a7cf5d0439408be2ddfe29971ada462aff6\",\"file_bytes\":2224,\"body_bytes\":824},{\"atom_id\":\"place-checks-by-cost\",\"file_sha256\":\"c556d8896d401bf3664f2bcd8c0d9fa6ca47e1a5f1a6b1a1eb6e492f3c14df0e\",\"content_sha256\":\"e6fae60c6ab08ceb35dac7d798ca502749900b61dde3115e2866c5f3d2f09249\",\"file_bytes\":1392,\"body_bytes\":259},{\"atom_id\":\"put-a-tool-behind-every-number\",\"file_sha256\":\"ca750fa57062ac317ad574d0e326e7fa10d01a8f8720d258db92cfed553b5d39\",\"content_sha256\":\"cf2d53466722731a8cb48ae20c7996a481f67d217fd8417382cebf605ed838be\",\"file_bytes\":2063,\"body_bytes\":784},{\"atom_id\":\"write-the-quality-bar-as-a-floor-with-exceptions\",\"file_sha256\":\"69b018c8f3a638f959c6ebc0bc4be6b04437cff5812b4c4c39305c625e56ecba\",\"content_sha256\":\"4a31f5e5f2d3970ff58f76038cff26534b0bb67b34d0c6277d9128ed1152d6b0\",\"file_bytes\":1454,\"body_bytes\":278}]"
carrier_sha256: 58103fc1ffe3ab2b21b70ffb2812293ec4f36ed5a4915252bd28266029897369
carrier_bytes: 10018
revision: 1
status: active
---
<!-- vpmodule:atom:begin detect-the-project-before-asking -->
---
instruction_id: detect-the-project-before-asking
title: Detect the project before you ask
summary: "Read the manifest, runner, lint, coverage, CI and harness first, report the finding in two lines, and then ask at most four questions that each carry a usable default."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "The project's quality bar is being set and its current state can be read from the repository."
conditions_does_not_apply_when: "The project's state is already known and recorded."
artifact_contract_output_type: project-detection
artifact_contract_required_data:
  - "the manifest, runner, lint config, coverage, CI and harness that were read"
  - the two-line finding
  - the questions asked
  - the default behind each question
artifact_contract_verified_by: no question asks for something the repository already states
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/constraints.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project/steps/codebase-map-offer.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Detect the project before you ask
1. **Detect first.** Read package.json / pyproject.toml / go.mod, the test runner, existing lint configs, current coverage output, CI workflows, and the agent harness in use. Report what you found in two lines. Never ask for anything you can read.
2. **Interview, at most four questions.** One at a time, each with your best guess and a usable default so "I don't know" still produces a working config:
   - Which dimensions beyond the floor (coverage, security, performance, accessibility, architecture)
   - Block or warn when a check fails mid-task
   - Target numbers, or measure today's values and hold them
   - Slowest check tolerated before handing work back

When the working directory already holds code, say so and offer to map it before the initialisation continues - a map the user does not want is skipped, not forced.
<!-- vpmodule:atom:end detect-the-project-before-asking -->
<!-- vpmodule:atom:begin keep-the-quality-bar-as-a-rising-floor -->
---
instruction_id: keep-the-quality-bar-as-a-rising-floor
title: Keep the quality bar as a rising floor
summary: "The bar is a floor that only rises: agents may not weaken it, the diff is inspected for weakening, today measured values become the new floor, and a gate the user disagrees with is corrected now."
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: An agreed quality bar is in force and a change is about to pass it.
conditions_does_not_apply_when: The bar is being written for the first time.
artifact_contract_output_type: floor-record
artifact_contract_required_data:
  - the measured values of today
  - the weakening found in the diff
  - the floor that must not fall
  - the gate that was corrected
artifact_contract_verified_by: "the diff shows no lowered threshold, skipped test, suppression comment, stub or new exception"
compatibility_excludes: []
compatibility_requires:
  - write-the-quality-bar-as-a-floor-with-exceptions
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/constraints.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=docs/adoption-guide.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Keep the quality bar as a rising floor
6. **Point the agent at it.** Add a line to the rules file
telling agents to read CONSTRAINTS.md and never weaken it to make a change pass.
7. **Verify.** Run the constraints against the current branch. If anything fails that the user disagrees with, fix the constraint now rather than leaving a gate people will learn to ignore.
- guard — inspect the diff for a weakened bar: lowered thresholds, skipped or deleted tests, new suppression comments, unfinished stubs, new exceptions
- ratchet — record today's measured values as the floor that must not fall
- **Ratcheting nothing.** Adoption should make quality monotonically better: each phase adds a gate that doesn't come back off. If a month in you can't name what's now enforced that wasn't before, the rollout has stalled.
<!-- vpmodule:atom:end keep-the-quality-bar-as-a-rising-floor -->
<!-- vpmodule:atom:begin place-checks-by-cost -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/constraints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Place each check by cost
5. **Place each check by cost.** Types, lint and secrets in the edit loop (seconds). Related tests and changed-line coverage at task end (under 90s). Everything else at review or in CI. Scope checks to the diff, not the whole repo.
<!-- vpmodule:atom:end place-checks-by-cost -->
<!-- vpmodule:atom:begin put-a-tool-behind-every-number -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/constraints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Put a tool behind every number
4. **Install what each picked dimension needs.** A dimension with a number and no tool behind it is an aspiration.
Use the de facto tool so existing config keeps working:
a code scanner for code scanning, a secret scanner for secrets, a dependency auditor for dependencies, an accessibility checker for accessibility, a web-vitals measurement for web vitals, a bundle-size limit for bundles, a dependency-boundary checker for boundaries, a mutation tester for assertion quality.
Record the exact command next to each rule in CONSTRAINTS.md. Accessibility and performance need a running URL; if the project has none, say so and drop the dimension rather than inventing a check. Add the commands to package.json as check:fast / check:task / check:full.
<!-- vpmodule:atom:end put-a-tool-behind-every-number -->
<!-- vpmodule:atom:begin write-the-quality-bar-as-a-floor-with-exceptions -->
---
instruction_id: write-the-quality-bar-as-a-floor-with-exceptions
title: Write the quality bar as a floor with an exceptions table
summary: "The bar is one file with a floor, enforced numbers, measured-only metrics and an exceptions table whose rows carry an owner and an expiry date."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The quality bar of a project is written down for others to run.
conditions_does_not_apply_when: The bar already exists and only its thresholds change.
artifact_contract_output_type: quality-bar
artifact_contract_required_data:
  - the floor
  - the enforced numbers
  - the measured-only metrics with today values
  - the exceptions table with owners and expiry dates
artifact_contract_verified_by: every number in the file carries a stated reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=.claude/commands/constraints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write the quality bar as a floor with an exceptions table
3. **Write CONSTRAINTS.md** at the repo root with a Floor section, enforced numbers, measured-only metrics with today's values, and an exceptions table with owners and expiry dates. Every number needs a stated reason.
<!-- vpmodule:atom:end write-the-quality-bar-as-a-floor-with-exceptions -->