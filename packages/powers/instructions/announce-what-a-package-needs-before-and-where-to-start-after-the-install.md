---
instruction_id: announce-what-a-package-needs-before-and-where-to-start-after-the-install
title: Announce what a package needs before and where to start after the install
summary: "A package carries two announcements, one read before the install or update and one read after it: what the package needs, such as a tool to install first, and where to start once the setup has run. An empty or missing announcement is not shown."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: A package is installed or updated.
conditions_does_not_apply_when: The package is being used and nothing is being installed.
artifact_contract_output_type: package-announcements
artifact_contract_required_data:
  - "what the package needs, said before the install"
  - "where to start, said after the setup has run"
  - the rule that an empty announcement is not shown
artifact_contract_verified_by: the announcement before the install states a need and the one after it states where to start
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/modules.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Announce what a package needs before and where to start after the install
Shown before the install or update, read from the module's source.
Use it for what the module needs, such as a tool to install first.
Shown after the install or update, once setup has run.
Use it for where to start.
An empty or missing message is not shown.
