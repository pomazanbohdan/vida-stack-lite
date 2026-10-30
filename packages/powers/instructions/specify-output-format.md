---
instruction_id: specify-output-format
title: Specify the output format at the required strictness
summary: "State the output contract at the strictness the consumer needs, show the shape in a template or example, and keep the terminology consistent."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The result must be readable or processable by someone else.
conditions_does_not_apply_when: The shape of the result does not affect its usability.
artifact_contract_output_type: output-contract
artifact_contract_required_data:
  - strictness level
  - template
  - required fields
  - example of the shape
artifact_contract_verified_by: the result matches the chosen strictness level
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/anthropic-best-practices.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Specify the output format at the required strictness
Provide templates for output format.
Match the level of strictness to your needs.
For strict requirements, say: ALWAYS use this exact template structure.
For flexible guidance, give a sensible default format and use your best judgment based on the analysis.
Adjust sections as needed for the specific analysis type.
Include the required sections in the template itself.
Provide input/output pairs where output quality depends on seeing examples.
Examples help agents understand the desired style and level of detail more clearly than descriptions alone.
Keep terminology consistent throughout the guidance.
Choose one term and use it throughout: always "API endpoint", always "field", always "extract".
Do not mix "API endpoint", "URL", "API route", and "path".
Do not mix "field", "box", "element", and "control".
Do not mix "extract", "pull", "get", and "retrieve".
Consistency helps agents understand and follow instructions.
