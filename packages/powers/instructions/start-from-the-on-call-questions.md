---
instruction_id: start-from-the-on-call-questions
title: Start from the on-call questions
summary: "Write down the questions an on-call engineer will ask about the feature before instrumenting anything, and match each signal to the question it answers."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A feature is about to be instrumented or its telemetry is being designed.
conditions_does_not_apply_when: No telemetry is being added or changed.
artifact_contract_output_type: on-call-question-set
artifact_contract_required_data:
  - the questions
  - the signal type matched to each question
  - the signals that answer none of them
artifact_contract_verified_by: every signal maps to one of the written questions and every question has a signal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Start from the on-call questions
Telemetry without a question is noise. Before instrumenting anything:
2–4 questions an on-call engineer will ask about this feature are written down
Every signal below maps to one of those questions
Each question is matched to the right signal type: metrics say **that** something is wrong, traces say **where**, logs say **why**
