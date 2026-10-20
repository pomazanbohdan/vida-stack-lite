---
instruction_id: propose-the-change-as-a-before-and-after-edit
title: Propose the change as a before-and-after edit
summary: "Show the current text and the replacement text for every affected artifact, name the exact section, and give the reason for each change."
capability_tags:
  - assess-change-impact
pattern_tags:
  - output-formatting
conditions_applies_when: A change is being proposed against artifacts that already hold text.
conditions_does_not_apply_when: The change creates a new artifact and there is no current text to replace.
artifact_contract_output_type: edit-proposal
artifact_contract_required_data:
  - the artifact
  - the section
  - the current text
  - the replacement text
  - the reason
artifact_contract_verified_by: "every proposal carries the current text, the replacement text and a reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/SKILL.md
status: active
revision: 1
---

# Propose the change as a before-and-after edit
Show old → new text format
Include story ID and section being modified
Provide rationale for each change
Specify exact sections to update
Show current content and proposed changes
Explain impact on MVP scope and requirements
Identify affected components, patterns, or technology choices
Describe diagram updates needed
Note any ripple effects on other components
Reference specific screens or components
Show wireframe or flow changes needed
Connect changes to user experience impact
Ensure each change includes before/after and justification
