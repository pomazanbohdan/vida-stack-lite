---
instruction_id: ask-before-a-completion-step-that-everyone-will-see
title: Ask before a completion step that everyone will see
summary: "A completion step runs once after the work writes its output, such as posting a document or opening a ticket, and it asks before any action the teammates will see."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - control-tiering
conditions_applies_when: A shared completion step would publish something to other people.
conditions_does_not_apply_when: The completion step writes only to the working copy.
artifact_contract_output_type: completion-step
artifact_contract_required_data:
  - what the completion step does
  - when it runs
  - the approval it asks for before anything visible happens
artifact_contract_verified_by: the step asks before any action the team will see
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Ask before a completion step that everyone will see
Instructions that run once after a skill writes its output, such as posting the document to a wiki or opening a ticket.
They should ask before any action teammates will see.
