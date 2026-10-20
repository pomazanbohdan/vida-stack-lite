---
instruction_id: offer-the-install-command-and-do-not-run-it
title: Offer the install command and do not run it
summary: "Anything named but not installed is offered with its install command, and the command is not run without being asked."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - code-minimization
conditions_applies_when: A dependency is named that is not installed.
conditions_does_not_apply_when: Everything the tool needs is already installed.
artifact_contract_output_type: install-offer
artifact_contract_required_data:
  - what is missing
  - the command that installs it
artifact_contract_verified_by: the command was offered and not run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/ecosystem.md
status: active
revision: 1
---

# Offer the install command and do not run it
For anything named but not installed,
- offer the install command; never run it unasked
