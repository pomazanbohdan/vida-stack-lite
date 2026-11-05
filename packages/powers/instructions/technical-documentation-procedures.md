---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: technical-documentation-procedures
title: Write procedures and code samples
summary: "Use numbered single imperative actions, optional prefixes, sub-step letters, bold UI names and device verbs; use code font, ALL_CAPS placeholders explained after the sample, and runnable minimal samples wrapped at 80 characters."
capability_tags:
  - write-technical-prose
pattern_tags:
  - procedure-steps
conditions_applies_when: Writing steps or code samples.
conditions_does_not_apply_when: Conceptual prose with no action.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each step is one action with a runnable sample and explained placeholders.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/technical-documentation/SKILL.md; sha256=3037479dd6cffaf043f27cd6b6eaec3cb5fb209210241f73757d15790271b1f2; locator=skills/technical-documentation/SKILL.md#L112-L130"
status: active
revision: 1
---

# Write procedures and code samples

A procedure is a numbered list of single imperative actions, each stating where to act and what to expect; code is set in code font, introduced by a sentence ending in a colon, and uses placeholders the reader cannot mistake for literals. One action per step; optional steps get an 'Optional:' prefix; a single-step procedure is a bullet, not '1.'. Sub-steps run a, b, c; document the shortest path, not every alternative. UI element names are bold and match on-screen casing; use 'click' for a mouse, 'tap' for touch, 'select' when device-agnostic. Code font applies to filenames, paths, commands, flags, parameters, and values — not product names. Placeholders are ALL_CAPS_WITH_UNDERSCORES, never '<your-key>' or 'YOUR_API_KEY', and are explained right after the sample ('Replace PROJECT_ID with...'). Command syntax uses [optional], {a|b} for exclusive choices, and '...' for repeatable arguments. Samples are runnable, minimal, wrapped at 80 characters, and show the expected output.
