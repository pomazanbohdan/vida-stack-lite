---
instruction_id: place-slow-checks-outside-the-edit-loop
title: Place the slow checks outside the edit loop
summary: "Cost decides where a check runs: anything over a few seconds leaves the edit loop, and a dimension that cannot run is dropped rather than faked."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: Checks are being assigned to the phases of the work.
conditions_does_not_apply_when: The checks already run outside the edit loop.
artifact_contract_output_type: check-placement
artifact_contract_required_data:
  - the phase each check runs in
  - the cost of each check
  - the dimensions that were dropped
artifact_contract_verified_by: the fast stage stays under a few seconds and every dropped dimension is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
  - operations
---

# Place the slow checks outside the edit loop

The single biggest mistake is running everything everywhere. A check that stalls the agent gets switched off, and a gate people switched off is worse than no gate, because the bar still looks like it exists.

**Cost decides placement.** Anything over a few seconds moves out of the edit loop.

That mapping matters more than the tools. `check:fast` is what runs after an edit, `check:task` when the agent thinks it's done, `check:full` in CI.

**Lighthouse and axe need a URL.** They only work against a running app, so they belong in the runtime stage against a preview deploy or a local server you start first. If the project has no URL to hit — a CLI, a library, a desktop app — say so and drop the dimension rather than inventing a check that can't run.

**A first run can be floor-only.** The floor guard is diff-only and needs no installs, so you can enforce the floor on day one and add numbered dimensions as you install each tool, rather than standing up every checker before the first commit is protected. Security tools that install machine-wide (gitleaks, osv-scanner) can also run CI-only if you'd rather keep laptops clean; declare where each dimension runs in the `Runs at` column.
