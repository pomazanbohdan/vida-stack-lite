---
instruction_id: read-the-installed-version-not-the-declared-range
title: "Read the installed version, not the declared range"
summary: The version that is installed is the fact; a range declared by a dependent hides the staleness of a reused artefact.
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - pinned-stack-table
conditions_applies_when: A document records the version of a dependency or a design system.
conditions_does_not_apply_when: Only a declared range exists and nothing was installed.
artifact_contract_output_type: version-record
artifact_contract_required_data:
  - the resolved version
  - where it was read from
artifact_contract_verified_by: the recorded version is the resolved one and no declared range stands in for it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-researcher.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read the installed version, not the declared range
Take the version from the installed package, not the range in your dependent's `package.json` — a caret range hides staleness.
When `node_modules` is absent the `require()` version lookup fails; resolve the version from the lockfile instead — still not the caret range
