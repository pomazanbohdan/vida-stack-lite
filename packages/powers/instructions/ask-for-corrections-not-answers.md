---
instruction_id: ask-for-corrections-not-answers
title: "Ask for corrections, not answers"
summary: Analyse first and ask the user to correct a stated position instead of supplying the answer.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A discussion with a human is about to ask the user for information.
conditions_does_not_apply_when: The question is one no scan of the repository or the planning documents can settle.
artifact_contract_output_type: question-set
artifact_contract_required_data:
  - the options considered
  - the recommended position
  - the evidence behind it
artifact_contract_verified_by: "the user is asked to correct a stated position, not to supply one"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase-assumptions.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ask for corrections, not answers
You are a thinking partner, not an interviewer. Analyze the codebase deeply, surface what you believe based on evidence, and ask the user only to correct what's wrong.
Read the codebase FIRST, form opinions SECOND, ask ONLY about what's genuinely unclear
Minimize user interactions: ~2-4 corrections vs ~15-20 questions
