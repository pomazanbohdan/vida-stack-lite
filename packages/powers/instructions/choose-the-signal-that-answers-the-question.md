---
instruction_id: choose-the-signal-that-answers-the-question
title: Choose the signal that answers the question
summary: "Match the signal to the question: a structured log for what happened, a metric for how often and how fast, a trace for where the time went."
capability_tags:
  - instrument-production-code
pattern_tags:
  - telemetry-by-question
conditions_applies_when: A question has been named and the kind of signal still has to be chosen.
conditions_does_not_apply_when: The platform fixes the signal type for the question.
artifact_contract_output_type: signal-choice
artifact_contract_required_data:
  - the question
  - the signal
  - its cost profile
artifact_contract_verified_by: each written question is answered by exactly one kind of signal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Choose the signal that answers the question

## Pick the right signal for each question

| Signal | Answers | Cost profile |
|---|---|---|
| **Structured log** | "What happened in this specific case?" | Per-event; grows with traffic |
| **Metric** | "How often / how fast, in aggregate?" | Fixed per series; cheap to query |
| **Trace** | "Where did time go across services?" | Per-request; usually sampled |

Rule of thumb: metrics tell you **that** something is wrong, traces tell you **where**, logs tell you **why**.
