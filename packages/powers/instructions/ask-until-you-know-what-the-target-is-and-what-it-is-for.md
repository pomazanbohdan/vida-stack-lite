---
instruction_id: ask-until-you-know-what-the-target-is-and-what-it-is-for
title: Ask until you know what the target is and what it is for
summary: "Orient on the target from its ticket first, then its plan, description and commits, and ask until both the what and the why are known."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A review starts and the target and its purpose are not both known yet.
conditions_does_not_apply_when: The target and its purpose are already established in this session.
artifact_contract_output_type: orientation-note
artifact_contract_required_data:
  - what the target is
  - what it is for
artifact_contract_verified_by: both the target and its purpose are known before the next step starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-01-orientation.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ask until you know what the target is and what it is for
Understand what the target is and what it is for. When a ticket covers the target (initiative-, epic-, story-, spike- or bug-*.md under the initiative folder, or an older SPEC*.md), read it first and in full and trust it. Then use the plan, PR description, and commit messages when they exist.
Ask the user questions until you know both.
